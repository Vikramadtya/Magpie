package com.keeper.refund;

import com.keeper.account.Account;
import com.keeper.account.AccountRepository;
import com.keeper.audit.Audit;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.crypto.FieldCrypto;
import com.keeper.fx.FxConverter;
import com.keeper.transaction.EntryOrigin;
import com.keeper.transaction.TransactionController;
import com.keeper.transaction.TransactionService;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Purchases waiting for money back, and the ones that got it. */
@Singleton
public class RefundService {

  @Serdeable
  public record Refund(
      UUID id,
      UUID transactionId,
      String status,
      long expectedMinor,
      Long receivedMinor,
      String currency,
      LocalDate purchasedOn,
      long purchaseMinor,
      String title,
      String categoryName,
      UUID accountId,
      String accountName,
      String note,
      LocalDate completedOn,
      UUID refundTransactionId) {}

  /** Totals are in the base currency; items keep their own. */
  @Serdeable
  public record Overview(
      String currency,
      int pendingCount,
      long pendingMinor,
      int doneCount,
      long receivedMinor,
      List<Refund> items) {}

  private final Db db;
  private final FxConverter fx;
  private final FieldCrypto crypto;
  private final AccountRepository accounts;
  private final TransactionService transactions;
  private final Audit audit;

  public RefundService(
      Db db,
      FxConverter fx,
      FieldCrypto crypto,
      AccountRepository accounts,
      TransactionService transactions,
      Audit audit) {
    this.db = db;
    this.fx = fx;
    this.crypto = crypto;
    this.accounts = accounts;
    this.transactions = transactions;
    this.audit = audit;
  }

  private static final String SELECT =
      "SELECT r.id, r.transaction_id, r.status, r.expected_minor, r.received_minor, t.currency, t.occurred_on, "
          + "t.amount_minor, COALESCE(py.name, c.name, 'Purchase'), c.name, a.id, a.name, r.note, r.completed_on, "
          + "r.refund_transaction_id FROM refunds r JOIN transactions t ON t.id = r.transaction_id "
          + "JOIN accounts a ON a.id = t.account_id LEFT JOIN payees py ON py.id = t.payee_id "
          + "LEFT JOIN categories c ON c.id = t.category_id WHERE r.workspace_id = ? AND t.deleted_at IS NULL";

  private Refund map(java.sql.ResultSet rs) throws java.sql.SQLException {
    long received = rs.getLong(5);
    return new Refund(
        rs.getObject(1, UUID.class),
        rs.getObject(2, UUID.class),
        rs.getString(3),
        rs.getLong(4),
        rs.wasNull() ? null : received,
        rs.getString(6),
        rs.getObject(7, LocalDate.class),
        rs.getLong(8),
        rs.getString(9),
        rs.getString(10),
        rs.getObject(11, UUID.class),
        rs.getString(12),
        rs.getString(13) == null ? null : crypto.open(rs.getString(13)),
        rs.getObject(14, LocalDate.class),
        rs.getObject(15, UUID.class));
  }

  public Overview overview(UUID ws) {
    var converter = fx.forWorkspace(ws);
    List<Refund> items =
        db.list(
            SELECT + " ORDER BY CASE r.status WHEN 'PENDING' THEN 0 ELSE 1 END, t.occurred_on DESC",
            this::map,
            ws);
    int pending = 0;
    int done = 0;
    long pendingMinor = 0;
    long receivedMinor = 0;
    for (Refund r : items) {
      if ("PENDING".equals(r.status())) {
        pending++;
        pendingMinor += converter.toBase(r.expectedMinor(), r.currency());
      } else {
        done++;
        receivedMinor +=
            converter.toBase(r.receivedMinor() == null ? 0 : r.receivedMinor(), r.currency());
      }
    }
    return new Overview(converter.base(), pending, pendingMinor, done, receivedMinor, items);
  }

  private Refund get(UUID ws, UUID id) {
    return db.one(SELECT + " AND r.id = ?", this::map, ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Refund", id.toString()));
  }

  /** Marks a purchase as waiting for a refund; the amount defaults to the whole purchase. */
  public Refund create(UUID ws, UUID actor, RefundController.CreateRequest r) {
    record Tx(String type, long amount, UUID loan, UUID transfer) {}
    Tx tx =
        db.one(
                "SELECT type, amount_minor, loan_id, transfer_id FROM transactions "
                    + "WHERE id = ? AND workspace_id = ? AND deleted_at IS NULL",
                rs ->
                    new Tx(
                        rs.getString(1),
                        rs.getLong(2),
                        rs.getObject(3, UUID.class),
                        rs.getObject(4, UUID.class)),
                r.transactionId(),
                ws)
            .orElseThrow(() -> new BadRequestException("Unknown transaction"));
    if (!"EXPENSE".equals(tx.type()) || tx.loan() != null)
      throw new BusinessRuleException("Only a purchase you paid for can be marked for a refund");
    long expected = r.expectedMinor() == null ? tx.amount() : r.expectedMinor();
    if (expected > tx.amount())
      throw new BusinessRuleException("A refund cannot be more than what you paid");
    if (db.count("SELECT count(*) FROM refunds WHERE transaction_id = ?", r.transactionId()) > 0)
      throw new BusinessRuleException("This purchase is already marked for a refund");

    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO refunds(id, workspace_id, transaction_id, expected_minor, note, created_by) VALUES (?,?,?,?,?,?)",
        id,
        ws,
        r.transactionId(),
        expected,
        seal(ws, r.note()),
        actor);
    audit.record(ws, actor, "refund", id, "CREATE", "expecting " + expected);
    return get(ws, id);
  }

  public Refund update(UUID ws, UUID actor, UUID id, RefundController.UpdateRequest r) {
    Refund current = get(ws, id);
    if (!"PENDING".equals(current.status()))
      throw new BusinessRuleException("A completed refund can no longer be changed");
    if (r.expectedMinor() > current.purchaseMinor())
      throw new BusinessRuleException("A refund cannot be more than what you paid");
    db.update(
        "UPDATE refunds SET expected_minor = ?, note = ? WHERE id = ? AND workspace_id = ?",
        r.expectedMinor(),
        seal(ws, r.note()),
        id,
        ws);
    audit.record(ws, actor, "refund", id, "UPDATE", "expecting " + r.expectedMinor());
    return get(ws, id);
  }

  /**
   * The money arrived. Optionally also adds it to an account as income (same payee), so the balance
   * matches the bank.
   */
  public Refund complete(UUID ws, UUID actor, UUID id, RefundController.CompleteRequest r) {
    Refund refund = get(ws, id);
    if (!"PENDING".equals(refund.status()))
      throw new BusinessRuleException("This refund is already complete");
    if (r.receivedMinor() > refund.purchaseMinor())
      throw new BusinessRuleException("A refund cannot be more than what you paid");

    UUID created = null;
    if (r.accountId() != null && r.receivedMinor() > 0) {
      Account account =
          accounts
              .find(ws, r.accountId())
              .orElseThrow(() -> new BadRequestException("Unknown account"));
      if (!account.currency().equals(refund.currency()))
        throw new BusinessRuleException(
            "This purchase was in "
                + refund.currency()
                + "; add the refund to a "
                + refund.currency()
                + " account");
      UUID payee =
          db.one(
                  "SELECT payee_id FROM transactions WHERE id = ?",
                  rs -> rs.getObject(1, UUID.class),
                  refund.transactionId())
              .orElse(null);
      created =
          db.tx(
              () ->
                  transactions.insertEntry(
                      ws,
                      actor,
                      null,
                      new TransactionController.Request(
                          account.id(),
                          "INCOME",
                          r.receivedMinor(),
                          r.receivedOn(),
                          null, // an income cannot carry the purchase's expense category
                          payee,
                          "Refund: " + refund.title(),
                          List.of(),
                          null,
                          null,
                          null),
                      EntryOrigin.NONE));
    }
    db.update(
        "UPDATE refunds SET status = 'DONE', received_minor = ?, completed_on = ?, refund_transaction_id = ? "
            + "WHERE id = ? AND workspace_id = ?",
        r.receivedMinor(),
        r.receivedOn(),
        created,
        id,
        ws);
    audit.record(ws, actor, "refund", id, "COMPLETE", "received " + r.receivedMinor());
    return get(ws, id);
  }

  /** Forgets the refund note; any income it added stays as an ordinary transaction. */
  public void delete(UUID ws, UUID actor, UUID id) {
    get(ws, id);
    db.update("DELETE FROM refunds WHERE id = ? AND workspace_id = ?", id, ws);
    audit.record(ws, actor, "refund", id, "DELETE", null);
  }

  private String seal(UUID ws, String note) {
    String clean = note == null || note.isBlank() ? null : note.trim();
    return clean == null ? null : crypto.seal(ws, clean);
  }
}

package com.keeper.transaction;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import com.keeper.common.db.SqlWhere;
import jakarta.inject.Singleton;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class TransactionRepository {

  /** Minimal row used when a write needs the previous state (balance reversal, locking). */
  public record Raw(
      UUID id,
      UUID accountId,
      String type,
      int direction,
      long amount,
      int version,
      UUID transferId) {}

  public record Insert(
      UUID workspaceId,
      UUID accountId,
      String type,
      int direction,
      long amountMinor,
      String currency,
      LocalDate occurredOn,
      UUID categoryId,
      UUID payeeId,
      String note,
      UUID transferId,
      UUID recurringRuleId,
      String importHash,
      UUID importBatchId,
      String idempotencyKey,
      UUID actor) {}

  private static final String SELECT =
      "SELECT t.id, t.account_id, a.name AS account_name, t.type, t.direction, t.amount_minor, t.currency, "
          + "t.occurred_on, t.category_id, c.name AS category_name, t.payee_id, p.name AS payee_name, t.note, "
          + "t.transfer_id, t.version, t.created_by, t.created_at, "
          + "COALESCE((SELECT array_agg(tt.tag_id) FROM transaction_tags tt WHERE tt.transaction_id = t.id), '{}') AS tag_ids "
          + "FROM transactions t JOIN accounts a ON a.id = t.account_id "
          + "LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN payees p ON p.id = t.payee_id ";

  private static final RowMapper<TransactionView> VIEW =
      rs ->
          new TransactionView(
              rs.getObject("id", UUID.class),
              rs.getObject("account_id", UUID.class),
              rs.getString("account_name"),
              rs.getString("type"),
              rs.getInt("direction"),
              rs.getLong("amount_minor"),
              rs.getString("currency"),
              rs.getObject("occurred_on", LocalDate.class),
              rs.getObject("category_id", UUID.class),
              rs.getString("category_name"),
              rs.getObject("payee_id", UUID.class),
              rs.getString("payee_name"),
              rs.getString("note"),
              uuids(rs, "tag_ids"),
              rs.getObject("transfer_id", UUID.class),
              rs.getInt("version"),
              rs.getObject("created_by", UUID.class),
              rs.getObject("created_at", OffsetDateTime.class).toInstant());

  private static List<UUID> uuids(java.sql.ResultSet rs, String col) throws SQLException {
    Object[] arr = (Object[]) rs.getArray(col).getArray();
    List<UUID> ids = new ArrayList<>(arr.length);
    for (Object o : arr) ids.add((UUID) o);
    return ids;
  }

  private final Db db;

  public TransactionRepository(Db db) {
    this.db = db;
  }

  /** Newest first; fetches one extra row so the caller knows whether another page exists. */
  public List<TransactionView> page(
      UUID ws, TransactionFilter filter, LocalDate cursorDate, UUID cursorId, int limit) {
    SqlWhere where = filter.toWhere(ws);
    if (cursorDate != null) {
      where.and("(t.occurred_on, t.id) < (?, ?)", cursorDate, cursorId);
    }
    return db.list(
        SELECT + "WHERE " + where.sql() + " ORDER BY t.occurred_on DESC, t.id DESC LIMIT ?",
        VIEW,
        where.argsWith(limit + 1));
  }

  public Optional<TransactionView> find(UUID ws, UUID id) {
    return db.one(
        SELECT + "WHERE t.workspace_id = ? AND t.id = ? AND t.deleted_at IS NULL", VIEW, ws, id);
  }

  public List<TransactionView> findTransferLegs(UUID ws, UUID transferId) {
    return db.list(
        SELECT
            + "WHERE t.workspace_id = ? AND t.transfer_id = ? AND t.deleted_at IS NULL ORDER BY t.direction",
        VIEW,
        ws,
        transferId);
  }

  public Optional<TransactionView> findByIdempotencyKey(UUID ws, String key) {
    return db.one(SELECT + "WHERE t.workspace_id = ? AND t.idempotency_key = ?", VIEW, ws, key);
  }

  /** Row lock so concurrent edits of the same transaction serialize. */
  public Optional<Raw> lock(UUID ws, UUID id) {
    return db.one(
        "SELECT id, account_id, type, direction, amount_minor, version, transfer_id FROM transactions "
            + "WHERE workspace_id = ? AND id = ? AND deleted_at IS NULL FOR UPDATE",
        RAW,
        ws,
        id);
  }

  private static final RowMapper<Raw> RAW =
      rs ->
          new Raw(
              rs.getObject("id", UUID.class),
              rs.getObject("account_id", UUID.class),
              rs.getString("type"),
              rs.getInt("direction"),
              rs.getLong("amount_minor"),
              rs.getInt("version"),
              rs.getObject("transfer_id", UUID.class));

  public List<Raw> lockTransferLegs(UUID ws, UUID transferId) {
    return db.list(
        "SELECT id, account_id, type, direction, amount_minor, version, transfer_id FROM transactions "
            + "WHERE workspace_id = ? AND transfer_id = ? AND deleted_at IS NULL FOR UPDATE",
        RAW,
        ws,
        transferId);
  }

  public UUID insert(Insert i) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO transactions(id, workspace_id, account_id, type, direction, amount_minor, currency, occurred_on, "
            + "category_id, payee_id, note, transfer_id, recurring_rule_id, import_hash, import_batch_id, "
            + "idempotency_key, created_by, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        i.workspaceId(),
        i.accountId(),
        i.type(),
        i.direction(),
        i.amountMinor(),
        i.currency(),
        i.occurredOn(),
        i.categoryId(),
        i.payeeId(),
        i.note(),
        i.transferId(),
        i.recurringRuleId(),
        i.importHash(),
        i.importBatchId(),
        i.idempotencyKey(),
        i.actor(),
        i.actor());
    return id;
  }

  public void update(
      UUID ws,
      UUID id,
      UUID accountId,
      String type,
      int direction,
      long amount,
      String currency,
      LocalDate date,
      UUID categoryId,
      UUID payeeId,
      String note,
      UUID actor) {
    db.update(
        "UPDATE transactions SET account_id = ?, type = ?, direction = ?, amount_minor = ?, currency = ?, occurred_on = ?, "
            + "category_id = ?, payee_id = ?, note = ?, updated_by = ?, updated_at = NOW(), version = version + 1 "
            + "WHERE workspace_id = ? AND id = ?",
        accountId,
        type,
        direction,
        amount,
        currency,
        date,
        categoryId,
        payeeId,
        note,
        actor,
        ws,
        id);
  }

  public void updateTransferMeta(
      UUID ws, UUID transferId, LocalDate date, String note, UUID actor) {
    db.update(
        "UPDATE transactions SET occurred_on = ?, note = ?, updated_by = ?, updated_at = NOW(), version = version + 1 "
            + "WHERE workspace_id = ? AND transfer_id = ?",
        date,
        note,
        actor,
        ws,
        transferId);
  }

  public void replaceTags(UUID transactionId, List<UUID> tagIds) {
    db.update("DELETE FROM transaction_tags WHERE transaction_id = ?", transactionId);
    if (tagIds != null && !tagIds.isEmpty()) {
      db.update(
          "INSERT INTO transaction_tags(transaction_id, tag_id) SELECT ?, unnest(?::uuid[]) ON CONFLICT DO NOTHING",
          transactionId,
          tagIds.stream().distinct().toList());
    }
  }

  public void softDelete(UUID ws, List<UUID> ids) {
    db.update(
        "UPDATE transactions SET deleted_at = NOW(), updated_at = NOW() WHERE workspace_id = ? AND id = ANY(?)",
        ws,
        ids);
  }

  public int recategorize(UUID ws, List<UUID> ids, UUID categoryId) {
    return db.update(
        "UPDATE transactions t SET category_id = c.id, version = t.version + 1, updated_at = NOW() FROM categories c "
            + "WHERE c.id = ? AND c.workspace_id = ? AND t.workspace_id = ? AND t.id = ANY(?) AND t.type = c.kind "
            + "AND t.deleted_at IS NULL",
        categoryId,
        ws,
        ws,
        ids);
  }

  public boolean existsImportHash(UUID accountId, String hash) {
    return db.count(
            "SELECT count(*) FROM transactions WHERE account_id = ? AND import_hash = ? AND deleted_at IS NULL",
            accountId,
            hash)
        > 0;
  }

  public boolean existsRecurringPosting(UUID ruleId, LocalDate date) {
    return db.count(
            "SELECT count(*) FROM transactions WHERE recurring_rule_id = ? AND occurred_on = ? AND deleted_at IS NULL",
            ruleId,
            date)
        > 0;
  }
}

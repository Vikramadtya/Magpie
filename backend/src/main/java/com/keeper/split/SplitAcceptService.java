package com.keeper.split;

import com.keeper.account.Account;
import com.keeper.account.AccountRepository;
import com.keeper.audit.Audit;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.common.exception.ConflictException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.fx.CurrencyUnits;
import com.keeper.fx.FxConverter;
import com.keeper.loan.LoanController;
import com.keeper.loan.LoanService;
import com.keeper.transaction.EntryOrigin;
import com.keeper.transaction.TransactionController;
import com.keeper.transaction.TransactionService;
import com.keeper.trip.TripRepository;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns a reviewed split-app item into Keeper's own records, so nothing special is needed
 * downstream:
 *
 * <ul>
 *   <li>you paid: one expense for <b>your share</b> (counts as spending, goes on the trip) plus a
 *       loan to each friend for theirs. Together they equal what left the card.
 *   <li>a friend paid: your share is booked on an "Owed to friends" account, which goes negative.
 *   <li>a friend pays you back: repays their loans. You pay a friend: moves money onto "Owed to
 *       friends".
 * </ul>
 */
@Singleton
public class SplitAcceptService {

  @Serdeable
  public record AcceptRequest(
      UUID accountId,
      UUID categoryId,
      UUID tripId,
      boolean noTrip,
      @Positive @Max(1_000_000_000_000L) Long accountAmountMinor) {}

  private final SplitInboxRepository inbox;
  private final AccountRepository accounts;
  private final TransactionService transactions;
  private final TripRepository trips;
  private final LoanService loans;
  private final FxConverter fx;
  private final Audit audit;
  private final Db db;

  public SplitAcceptService(
      SplitInboxRepository inbox,
      AccountRepository accounts,
      TransactionService transactions,
      TripRepository trips,
      LoanService loans,
      FxConverter fx,
      Audit audit,
      Db db) {
    this.inbox = inbox;
    this.accounts = accounts;
    this.transactions = transactions;
    this.trips = trips;
    this.loans = loans;
    this.fx = fx;
    this.audit = audit;
    this.db = db;
  }

  public List<InboxItem> todo(UUID ws) {
    return inbox.list(ws, List.of("PENDING", "CHANGED", "REMOVED"));
  }

  public List<InboxItem> done(UUID ws) {
    return inbox.list(ws, List.of("ACCEPTED"));
  }

  public long count(UUID ws) {
    return inbox.countActionable(ws);
  }

  public InboxItem accept(UUID ws, UUID actor, UUID id, AcceptRequest r) {
    db.tx(
        () -> {
          InboxItem item = item(ws, id);
          if (!"PENDING".equals(item.status()))
            throw new ConflictException("This item was already handled");
          inbox.markAccepted(id, apply(ws, actor, item, r));
        });
    audit.record(ws, actor, "inbox", id, "ACCEPT", item(ws, id).title());
    return item(ws, id);
  }

  /** The split app changed an accepted item: undo what was recorded and record the new version. */
  public InboxItem applyUpdate(UUID ws, UUID actor, UUID id, AcceptRequest r) {
    db.tx(
        () -> {
          InboxItem item = item(ws, id);
          if (!"CHANGED".equals(item.status())) throw new ConflictException("Nothing to update");
          var old = inbox.createdFor(id);
          revert(ws, actor, old);
          AcceptRequest use =
              new AcceptRequest(
                  r != null && r.accountId() != null ? r.accountId() : old.accountId(),
                  r == null ? null : r.categoryId(),
                  r != null && r.tripId() != null ? r.tripId() : old.tripId(),
                  r != null && r.noTrip(),
                  r == null ? null : r.accountAmountMinor());
          inbox.markAccepted(id, apply(ws, actor, item, use));
        });
    audit.record(ws, actor, "inbox", id, "UPDATE", "applied the split app's change");
    return item(ws, id);
  }

  /** Deleted or changed in the split app, and you want it gone from Keeper too. */
  public InboxItem removeRecords(UUID ws, UUID actor, UUID id) {
    db.tx(
        () -> {
          InboxItem item = item(ws, id);
          if (!"CHANGED".equals(item.status()) && !"REMOVED".equals(item.status()))
            throw new ConflictException("Nothing to remove");
          revert(ws, actor, inbox.createdFor(id));
          inbox.setStatus(id, "DISMISSED");
        });
    audit.record(ws, actor, "inbox", id, "REMOVE", "removed what the split app item had recorded");
    return item(ws, id);
  }

  /** Ignore the split app's change and keep what Keeper already has. */
  public InboxItem keep(UUID ws, UUID id) {
    InboxItem item = item(ws, id);
    if (!"CHANGED".equals(item.status()) && !"REMOVED".equals(item.status()))
      throw new ConflictException("Nothing to keep");
    inbox.keepAsIs(id);
    return item(ws, id);
  }

  public InboxItem dismiss(UUID ws, UUID id) {
    InboxItem item = item(ws, id);
    if (!"PENDING".equals(item.status()))
      throw new ConflictException("This item was already handled");
    inbox.setStatus(id, "DISMISSED");
    return item(ws, id);
  }

  // ---------- applying ----------

  private SplitInboxRepository.Created apply(UUID ws, UUID actor, InboxItem item, AcceptRequest r) {
    AcceptRequest req = r == null ? new AcceptRequest(null, null, null, false, null) : r;
    return "EXPENSE".equals(item.kind())
        ? applyExpense(ws, actor, item, req)
        : applySettlement(ws, actor, item, req);
  }

  private SplitInboxRepository.Created applyExpense(
      UUID ws, UUID actor, InboxItem item, AcceptRequest r) {
    String note = noteFor(item);
    UUID tripId = resolveTrip(ws, item, r);
    List<UUID> txIds = new ArrayList<>();
    List<UUID> loanIds = new ArrayList<>();
    long mine = item.myShareMinor() == null ? 0 : item.myShareMinor();

    if (Boolean.TRUE.equals(item.paidByMe())) {
      Account account = requireAccount(ws, r);
      long totalAccount = inAccount(item, account, r);
      List<Long> parts = new ArrayList<>();
      parts.add(mine);
      item.shares().forEach(s -> parts.add(s.shareMinor()));
      List<Long> portions = allocate(totalAccount, item.totalMinor(), parts);

      if (portions.get(0) > 0) {
        txIds.add(
            expense(ws, actor, account.id(), portions.get(0), item, r.categoryId(), note, tripId));
      }
      for (int i = 0; i < item.shares().size(); i++) {
        long portion = portions.get(i + 1);
        if (portion <= 0) continue;
        var loan =
            loans.create(
                ws,
                actor,
                new LoanController.CreateRequest(
                    item.shares().get(i).name(),
                    "LENT",
                    account.id(),
                    portion,
                    item.occurredOn(),
                    null,
                    note));
        loanIds.add(loan.id());
      }
      return new SplitInboxRepository.Created(account.id(), tripId, txIds, loanIds);
    }

    // a friend paid: only your share is yours; it is owed to them until you settle
    UUID owed = owedAccount(ws, item.currency());
    if (mine > 0) txIds.add(expense(ws, actor, owed, mine, item, r.categoryId(), note, tripId));
    return new SplitInboxRepository.Created(owed, tripId, txIds, loanIds);
  }

  private SplitInboxRepository.Created applySettlement(
      UUID ws, UUID actor, InboxItem item, AcceptRequest r) {
    Account account = requireAccount(ws, r);
    long totalAccount = inAccount(item, account, r);
    String note =
        (item.title() != null && !item.title().isBlank())
            ? item.title()
            : "Settlement with " + item.counterparty();
    List<UUID> txIds = new ArrayList<>();

    if ("RECEIVED".equals(item.direction())) {
      long remaining = totalAccount;
      for (var loan : loans.openLentTo(ws, item.counterparty(), account.currency())) {
        if (remaining <= 0) break;
        long pay = Math.min(remaining, loan.outstandingMinor());
        txIds.add(
            loans.repayTx(
                ws,
                actor,
                loan.id(),
                new LoanController.PaymentRequest(account.id(), pay, item.occurredOn(), note)));
        remaining -= pay;
      }
      if (remaining > 0) {
        throw new BusinessRuleException(
            item.counterparty()
                + " owes you less than "
                + money(totalAccount, account.currency())
                + " in Keeper yet. Accept the related expenses first, then this payment.");
      }
      return new SplitInboxRepository.Created(account.id(), null, txIds, List.of());
    }

    // you paid a friend: money moves onto "Owed to friends", clearing what you owe
    UUID owed = owedAccount(ws, item.currency());
    boolean sameCurrency = account.currency().equals(item.currency());
    var legs =
        transactions.transfer(
            ws,
            actor,
            null,
            new TransactionController.TransferRequest(
                account.id(),
                owed,
                totalAccount,
                sameCurrency ? null : item.totalMinor(),
                item.occurredOn(),
                note));
    txIds.add(legs.get(0).id());
    return new SplitInboxRepository.Created(account.id(), null, txIds, List.of());
  }

  private UUID expense(
      UUID ws,
      UUID actor,
      UUID accountId,
      long amount,
      InboxItem item,
      UUID categoryId,
      String note,
      UUID tripId) {
    UUID id =
        transactions.insertEntry(
            ws,
            actor,
            null,
            new TransactionController.Request(
                accountId,
                "EXPENSE",
                amount,
                item.occurredOn(),
                categoryId,
                null,
                note,
                List.of(),
                null,
                null),
            EntryOrigin.NONE);
    if (tripId != null) trips.assign(ws, tripId, List.of(id));
    return id;
  }

  /** Undoes the records an earlier accept created; each is a soft delete, so still recoverable. */
  private void revert(UUID ws, UUID actor, SplitInboxRepository.Created c) {
    for (UUID loanId : c.loanIds()) {
      try {
        loans.delete(ws, actor, loanId);
      } catch (ResourceNotFoundException e) {
        // already deleted by hand
      }
    }
    for (UUID txId : c.txIds()) transactions.deleteOne(ws, actor, txId);
  }

  // ---------- helpers ----------

  private InboxItem item(UUID ws, UUID id) {
    return inbox
        .find(ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Inbox item", id.toString()));
  }

  private Account requireAccount(UUID ws, AcceptRequest r) {
    if (r.accountId() == null)
      throw new BadRequestException("Choose the account this went through");
    return accounts
        .find(ws, r.accountId())
        .orElseThrow(() -> new BadRequestException("Unknown account"));
  }

  /**
   * What the account was charged: the same amount, or converted (or the exact figure you typed).
   */
  private long inAccount(InboxItem item, Account account, AcceptRequest r) {
    if (account.currency().equals(item.currency())) return item.totalMinor();
    if (r.accountAmountMinor() != null) return r.accountAmountMinor();
    return fx.convert(item.totalMinor(), item.currency(), account.currency())
        .orElseThrow(
            () ->
                new BusinessRuleException(
                    "No exchange rate for "
                        + item.currency()
                        + " to "
                        + account.currency()
                        + " yet. Enter the amount charged to the account."));
  }

  /**
   * Splits {@code totalAccount} in proportion to {@code parts} without losing a cent to rounding.
   */
  static List<Long> allocate(long totalAccount, long total, List<Long> parts) {
    List<Long> out = new ArrayList<>();
    long cumulative = 0;
    long previous = 0;
    for (long p : parts) {
      cumulative += p;
      long current =
          BigDecimal.valueOf(totalAccount)
              .multiply(BigDecimal.valueOf(cumulative))
              .divide(BigDecimal.valueOf(total), 0, RoundingMode.HALF_UP)
              .longValueExact();
      out.add(current - previous);
      previous = current;
    }
    return out;
  }

  /**
   * A trip for the group: the one you chose, an existing one with the same group or name, or a new
   * one.
   */
  private UUID resolveTrip(UUID ws, InboxItem item, AcceptRequest r) {
    if (r.noTrip()) return null;
    if (r.tripId() != null) return r.tripId();
    String name = item.groupName();
    if (name == null || name.isBlank()) return null;
    Optional<UUID> existing =
        item.groupId() == null ? Optional.empty() : trips.findIdByExternalRef(ws, item.groupId());
    if (existing.isEmpty()) existing = trips.findIdByName(ws, name);
    if (existing.isPresent()) {
      if (trips.externalRef(ws, existing.get()).isPresent())
        trips.extendToCover(existing.get(), item.occurredOn());
      return existing.get();
    }
    return trips.insertFromGroup(ws, name, item.occurredOn(), item.groupId());
  }

  /**
   * The place what you owe friends is tracked, one per currency. It goes negative while you owe.
   */
  private UUID owedAccount(UUID ws, String currency) {
    String name = "Owed to friends (" + currency + ")";
    return db.one(
            "SELECT id FROM accounts WHERE workspace_id = ? AND name = ? LIMIT 1",
            rs -> rs.getObject(1, UUID.class),
            ws,
            name)
        .orElseGet(() -> accounts.insert(ws, name, "OTHER", currency, 0));
  }

  private static String noteFor(InboxItem item) {
    String title = item.title() == null || item.title().isBlank() ? "Shared expense" : item.title();
    return item.groupName() == null || item.groupName().isBlank()
        ? title
        : title + " · " + item.groupName();
  }

  private static String money(long minor, String currency) {
    return new BigDecimal(minor).movePointLeft(CurrencyUnits.exponent(currency)).toPlainString()
        + " "
        + currency;
  }
}

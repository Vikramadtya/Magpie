package com.keeper.lending;

import com.keeper.account.AccountRepository;
import com.keeper.auth.User;
import com.keeper.auth.UserRepository;
import com.keeper.common.db.Db;
import com.keeper.payee.PayeeRepository;
import com.keeper.person.PersonRepository;
import com.keeper.transaction.EntryListener;
import com.keeper.transaction.EntryOrigin;
import com.keeper.transaction.Normalised;
import com.keeper.transaction.Normaliser;
import com.keeper.transaction.TransactionRepository;
import com.keeper.transaction.TransactionView;
import jakarta.inject.Singleton;
import java.util.Optional;
import java.util.UUID;

/**
 * Keeps the owner's ledger in step with what a guest records on a lent account: every expense the
 * guest enters appears in the owner's ledger as spending by that guest. The guest's entry is the
 * source; the owner may recategorise or delete their copy without affecting it.
 */
@Singleton
public class MirrorService implements EntryListener {

  private record Link(UUID shareId, UUID ownerWs, UUID ownerAccountId, UUID personId) {}

  private record Copy(UUID id, UUID ownerWs, UUID accountId, long amount) {}

  private final Db db;
  private final TransactionRepository transactions;
  private final AccountRepository accounts;
  private final PayeeRepository payees;
  private final PersonRepository people;
  private final UserRepository users;
  private final Normaliser normaliser;

  public MirrorService(
      Db db,
      TransactionRepository transactions,
      AccountRepository accounts,
      PayeeRepository payees,
      PersonRepository people,
      UserRepository users,
      Normaliser normaliser) {
    this.db = db;
    this.transactions = transactions;
    this.accounts = accounts;
    this.payees = payees;
    this.people = people;
    this.users = users;
    this.normaliser = normaliser;
  }

  @Override
  public void created(UUID ws, UUID actor, TransactionView e) {
    Optional<Link> link = activeLink(ws, e.accountId());
    if (link.isEmpty() || !"EXPENSE".equals(e.type())) return;
    Link l = link.get();
    UUID personId = personFor(l, actor);
    Normalised base =
        normaliser.compute(l.ownerWs(), e.currency(), e.amountMinor(), e.occurredOn());
    UUID id =
        transactions.insert(
            new TransactionRepository.Insert(
                l.ownerWs(),
                l.ownerAccountId(),
                "EXPENSE",
                -1,
                e.amountMinor(),
                e.currency(),
                e.occurredOn(),
                categoryNamed(l.ownerWs(), e.categoryName()),
                payeeNamed(l.ownerWs(), e.payeeName()),
                e.note(),
                null,
                EntryOrigin.NONE,
                null,
                actor,
                e.origAmountMinor(),
                e.origCurrency(),
                base,
                personId));
    db.update("UPDATE transactions SET mirror_of = ? WHERE id = ?", e.id(), id);
    accounts.adjustBalance(l.ownerWs(), l.ownerAccountId(), -e.amountMinor());
  }

  @Override
  public void updated(UUID ws, UUID actor, TransactionView e) {
    if (activeLink(ws, e.accountId()).isEmpty()) return;
    copyOf(e.id(), false)
        .ifPresent(
            c -> {
              Normalised base =
                  normaliser.compute(c.ownerWs(), e.currency(), e.amountMinor(), e.occurredOn());
              db.update(
                  "UPDATE transactions SET amount_minor = ?, occurred_on = ?, note = ?, "
                      + "category_id = COALESCE(?, category_id), payee_id = COALESCE(?, payee_id), "
                      + "orig_amount_minor = ?, orig_currency = ?, base_amount_minor = ?, base_currency = ?, "
                      + "base_fx_rate = ?, base_overridden = FALSE, updated_by = ?, "
                      + "version = version + 1, updated_at = NOW() WHERE id = ?",
                  e.amountMinor(),
                  e.occurredOn(),
                  e.note(),
                  categoryNamed(c.ownerWs(), e.categoryName()),
                  payeeNamed(c.ownerWs(), e.payeeName()),
                  e.origAmountMinor(),
                  e.origCurrency(),
                  base.amountMinor(),
                  base.currency(),
                  base.rate(),
                  actor,
                  c.id());
              accounts.adjustBalance(c.ownerWs(), c.accountId(), c.amount() - e.amountMinor());
            });
  }

  @Override
  public void deleted(UUID ws, UUID entryId) {
    copyOf(entryId, false)
        .ifPresent(
            c -> {
              transactions.softDelete(c.ownerWs(), java.util.List.of(c.id()));
              accounts.adjustBalance(c.ownerWs(), c.accountId(), c.amount());
            });
  }

  @Override
  public void restored(UUID ws, UUID entryId) {
    copyOf(entryId, true)
        .ifPresent(
            c -> {
              transactions.undelete(c.ownerWs(), java.util.List.of(c.id()));
              accounts.adjustBalance(c.ownerWs(), c.accountId(), -c.amount());
            });
  }

  /** The owner's side of a guest's account, while the loan is active. */
  private Optional<Link> activeLink(UUID guestWs, UUID guestAccountId) {
    return db.one(
        "SELECT s.id, s.owner_workspace_id, s.account_id, s.person_id FROM accounts a "
            + "JOIN account_shares s ON s.id = a.share_id "
            + "WHERE a.workspace_id = ? AND a.id = ? AND a.memo AND s.status = 'ACTIVE'",
        rs ->
            new Link(
                rs.getObject(1, UUID.class),
                rs.getObject(2, UUID.class),
                rs.getObject(3, UUID.class),
                rs.getObject(4, UUID.class)),
        guestWs,
        guestAccountId);
  }

  private Optional<Copy> copyOf(UUID guestEntryId, boolean deleted) {
    return db.one(
        "SELECT id, workspace_id, account_id, amount_minor FROM transactions WHERE mirror_of = ? AND deleted_at IS "
            + (deleted ? "NOT " : "")
            + "NULL FOR UPDATE",
        rs ->
            new Copy(
                rs.getObject(1, UUID.class),
                rs.getObject(2, UUID.class),
                rs.getObject(3, UUID.class),
                rs.getLong(4)),
        guestEntryId);
  }

  /** The owner's label for this guest, recreated if the owner removed it. */
  private UUID personFor(Link l, UUID guestUserId) {
    if (l.personId() != null) return l.personId();
    User guest = users.findById(guestUserId).orElseThrow();
    UUID id = people.upsert(l.ownerWs(), LendingService.displayName(guest)).id();
    db.update("UPDATE account_shares SET person_id = ? WHERE id = ?", id, l.shareId());
    return id;
  }

  private UUID categoryNamed(UUID ws, String name) {
    if (name == null) return null;
    return db.one(
            "SELECT id FROM categories WHERE workspace_id = ? AND kind = 'EXPENSE' AND lower(name) = lower(?) LIMIT 1",
            rs -> rs.getObject(1, UUID.class),
            ws,
            name)
        .orElse(null);
  }

  private UUID payeeNamed(UUID ws, String name) {
    return name == null || name.isBlank() ? null : payees.upsert(ws, name, null).id();
  }
}

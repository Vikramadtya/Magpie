package com.keeper.transaction;

import com.keeper.account.Account;
import com.keeper.account.AccountRepository;
import com.keeper.audit.Audit;
import com.keeper.category.Category;
import com.keeper.category.CategoryRepository;
import com.keeper.common.CursorPage;
import com.keeper.common.RefChecks;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.common.exception.ConflictException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.fx.FxConverter;
import com.keeper.payee.PayeeRepository;
import com.keeper.transaction.TransactionRepository.Insert;
import com.keeper.transaction.TransactionRepository.Raw;
import jakarta.inject.Singleton;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Singleton
public class TransactionService {
  private final TransactionRepository transactions;
  private final AccountRepository accounts;
  private final CategoryRepository categories;
  private final PayeeRepository payees;
  private final TransferFactory transfers;
  private final FxConverter fx;
  private final Normaliser normaliser;
  private final RevisionService revisions;
  private final RefChecks refs;
  private final Audit audit;
  private final Db db;

  public TransactionService(
      TransactionRepository transactions,
      AccountRepository accounts,
      CategoryRepository categories,
      PayeeRepository payees,
      TransferFactory transfers,
      FxConverter fx,
      Normaliser normaliser,
      RevisionService revisions,
      RefChecks refs,
      Audit audit,
      Db db) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.categories = categories;
    this.payees = payees;
    this.transfers = transfers;
    this.fx = fx;
    this.normaliser = normaliser;
    this.revisions = revisions;
    this.refs = refs;
    this.audit = audit;
    this.db = db;
  }

  // ---------- reads ----------

  public CursorPage<TransactionView> list(
      UUID ws, TransactionFilter filter, String cursor, int limit) {
    int size = Math.min(Math.max(limit, 1), 200);
    LocalDate cursorDate = null;
    UUID cursorId = null;
    if (cursor != null && !cursor.isBlank()) {
      try {
        String[] parts =
            new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|");
        cursorDate = LocalDate.parse(parts[0]);
        cursorId = UUID.fromString(parts[1]);
      } catch (RuntimeException e) {
        throw new BadRequestException("Invalid cursor");
      }
    }
    List<TransactionView> rows = transactions.page(ws, filter, cursorDate, cursorId, size);
    if (rows.size() <= size) {
      return new CursorPage<>(rows, null);
    }
    List<TransactionView> items = rows.subList(0, size);
    TransactionView last = items.get(size - 1);
    String next =
        Base64.getUrlEncoder()
            .withoutPadding()
            .encodeToString((last.occurredOn() + "|" + last.id()).getBytes(StandardCharsets.UTF_8));
    return new CursorPage<>(items, next);
  }

  public TransactionView get(UUID ws, UUID id) {
    return transactions
        .find(ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Transaction", id.toString()));
  }

  // ---------- writes ----------

  public TransactionView create(
      UUID ws, UUID actor, String idempotencyKey, TransactionController.Request r) {
    if (idempotencyKey != null) {
      var existing = transactions.findByIdempotencyKey(ws, idempotencyKey);
      if (existing.isPresent()) return existing.get();
    }
    UUID id = db.tx(() -> insertEntry(ws, actor, idempotencyKey, r, EntryOrigin.NONE));
    audit.record(ws, actor, "transaction", id, "CREATE", r.type() + " " + r.amountMinor());
    return get(ws, id);
  }

  /** Shared by manual entry, recurring postings, CSV import, and loans. */
  public UUID insertEntry(
      UUID ws,
      UUID actor,
      String idempotencyKey,
      TransactionController.Request r,
      EntryOrigin origin) {
    Account account =
        accounts
            .find(ws, r.accountId())
            .orElseThrow(() -> new BadRequestException("Unknown account"));
    UUID categoryId = validateCategoryAndPayee(ws, r);
    int direction = "INCOME".equals(r.type()) ? 1 : -1;
    Amounts amounts = resolveAmounts(account, r);
    Normalised base =
        normaliser.compute(ws, account.currency(), amounts.accountMinor(), r.occurredOn());
    UUID id =
        transactions.insert(
            new Insert(
                ws,
                account.id(),
                r.type(),
                direction,
                amounts.accountMinor(),
                account.currency(),
                r.occurredOn(),
                categoryId,
                r.payeeId(),
                clean(r.note()),
                null,
                origin,
                idempotencyKey,
                actor,
                amounts.origMinor(),
                amounts.origCurrency(),
                base,
                spentBy(ws, r.spentById())));
    transactions.replaceTags(id, validTags(ws, r.tagIds()));
    accounts.adjustBalance(ws, account.id(), direction * amounts.accountMinor());
    return id;
  }

  public List<TransactionView> transfer(
      UUID ws, UUID actor, String idempotencyKey, TransactionController.TransferRequest r) {
    if (idempotencyKey != null) {
      var existing = transactions.findByIdempotencyKey(ws, idempotencyKey);
      if (existing.isPresent()) {
        return transactions.findTransferLegs(ws, existing.get().transferId());
      }
    }
    if (r.fromAccountId().equals(r.toAccountId())) {
      throw new BadRequestException("Choose two different accounts");
    }
    Account from =
        accounts
            .find(ws, r.fromAccountId())
            .orElseThrow(() -> new BadRequestException("Unknown account"));
    Account to =
        accounts
            .find(ws, r.toAccountId())
            .orElseThrow(() -> new BadRequestException("Unknown account"));
    long amountIn = r.destAmountMinor() == null ? r.amountMinor() : r.destAmountMinor();
    if (r.destAmountMinor() == null && !from.currency().equals(to.currency())) {
      throw new BadRequestException("destAmountMinor is required between different currencies");
    }
    TransferFactory.Legs legs =
        transfers.create(
            ws,
            from,
            to,
            r.amountMinor(),
            amountIn,
            r.occurredOn(),
            clean(r.note()),
            idempotencyKey,
            actor);
    db.tx(
        () -> {
          legs.both().forEach(transactions::insert);
          accounts.adjustBalance(ws, from.id(), -r.amountMinor());
          accounts.adjustBalance(ws, to.id(), amountIn);
        });
    audit.record(
        ws, actor, "transfer", legs.transferId(), "CREATE", from.name() + " → " + to.name());
    return transactions.findTransferLegs(ws, legs.transferId());
  }

  public TransactionView update(
      UUID ws, UUID actor, UUID id, TransactionController.UpdateRequest r) {
    db.tx(
        () -> {
          Raw cur = lockOrFail(ws, id);
          if (r.expectedVersion() != null && r.expectedVersion() != cur.version()) {
            throw new ConflictException("This transaction was changed by someone else");
          }
          TransactionView before = get(ws, id);
          if ("TRANSFER".equals(cur.type())) {
            revisions.record(ws, actor, "UPDATE", before);
            transactions.updateTransferMeta(
                ws, cur.transferId(), r.occurredOn(), clean(r.note()), actor);
            return;
          }
          if ("TRANSFER".equals(r.type()))
            throw new BadRequestException("Use the transfer endpoint");
          var req = r.toRequest();
          Account account =
              accounts
                  .find(ws, r.accountId())
                  .orElseThrow(() -> new BadRequestException("Unknown account"));
          UUID categoryId = validateCategoryAndPayee(ws, req);
          int direction = "INCOME".equals(r.type()) ? 1 : -1;
          Amounts amounts = resolveAmounts(account, req);
          // A hand-set base amount survives edits that don't change what it was derived from.
          boolean sameBasis =
              before.baseOverridden()
                  && before.accountId().equals(account.id())
                  && before.amountMinor() == amounts.accountMinor()
                  && before.occurredOn().equals(r.occurredOn());
          Normalised base =
              sameBasis
                  ? new Normalised(
                      before.baseAmountMinor(), before.baseCurrency(), before.baseFxRate(), true)
                  : normaliser.compute(
                      ws, account.currency(), amounts.accountMinor(), r.occurredOn());
          revisions.record(ws, actor, "UPDATE", before);
          accounts.adjustBalance(ws, cur.accountId(), -cur.direction() * cur.amount());
          accounts.adjustBalance(ws, account.id(), direction * amounts.accountMinor());
          transactions.update(
              ws,
              id,
              account.id(),
              r.type(),
              direction,
              amounts.accountMinor(),
              account.currency(),
              r.occurredOn(),
              categoryId,
              r.payeeId(),
              clean(r.note()),
              actor,
              amounts.origMinor(),
              amounts.origCurrency(),
              base,
              spentBy(ws, req.spentById()));
          transactions.replaceTags(id, validTags(ws, r.tagIds()));
        });
    audit.record(ws, actor, "transaction", id, "UPDATE", r.type() == null ? "" : r.type());
    return get(ws, id);
  }

  public void delete(UUID ws, UUID actor, UUID id) {
    db.tx(() -> deleteOne(ws, actor, id));
    audit.record(ws, actor, "transaction", id, "DELETE", "");
  }

  public int bulkDelete(UUID ws, UUID actor, List<UUID> ids) {
    db.tx(() -> ids.forEach(id -> deleteOne(ws, actor, id)));
    audit.record(ws, actor, "transaction", null, "BULK_DELETE", ids.size() + " transactions");
    return ids.size();
  }

  public int bulkSpentBy(UUID ws, UUID actor, List<UUID> ids, UUID personId) {
    refs.person(ws, personId);
    int n = transactions.setSpentBy(ws, ids, personId);
    audit.record(ws, actor, "transaction", null, "BULK_SPENT_BY", n + " transactions");
    return n;
  }

  /** Validates the person belongs to this ledger; null means the ledger owner. */
  private UUID spentBy(UUID ws, UUID personId) {
    refs.person(ws, personId);
    return personId;
  }

  public int bulkRecategorize(UUID ws, UUID actor, List<UUID> ids, UUID categoryId) {
    refs.category(ws, categoryId);
    int n = transactions.recategorize(ws, ids, categoryId);
    audit.record(ws, actor, "transaction", null, "BULK_RECATEGORIZE", n + " transactions");
    return n;
  }

  // ---------- undo / restore ----------

  @io.micronaut.serde.annotation.Serdeable
  public record UndoResult(String action, TransactionView transaction) {}

  /**
   * Reverts the latest change to this transaction: puts a deleted one back, or restores the
   * previous values.
   */
  public UndoResult undo(UUID ws, UUID actor, UUID id) {
    UndoResult result =
        db.tx(
            () -> {
              var rev =
                  revisions
                      .latestOpen(ws, id)
                      .orElseThrow(
                          () -> new ResourceNotFoundException("Change to undo", id.toString()));
              if ("DELETE".equals(rev.action())) {
                restoreRows(ws, id);
                revisions.markUndone(rev.id());
                return new UndoResult("RESTORED", get(ws, id));
              }
              revertUpdate(ws, actor, id, rev.snapshot());
              revisions.markUndone(rev.id());
              return new UndoResult("REVERTED", get(ws, id));
            });
    audit.record(ws, actor, "transaction", id, "UNDO", result.action());
    return result;
  }

  /** Brings a deleted transaction (both legs for a transfer) back. */
  public TransactionView restore(UUID ws, UUID actor, UUID id) {
    db.tx(() -> restoreRows(ws, id));
    audit.record(ws, actor, "transaction", id, "RESTORE", "");
    return get(ws, id);
  }

  public List<TransactionView> deleted(UUID ws) {
    return transactions.deleted(ws, 50);
  }

  private void restoreRows(UUID ws, UUID id) {
    Raw row =
        transactions
            .lockDeleted(ws, id)
            .orElseThrow(() -> new ConflictException("This transaction is not deleted"));
    List<Raw> legs =
        row.transferId() == null
            ? List.of(row)
            : transactions.lockDeletedTransferLegs(ws, row.transferId());
    for (Raw leg : legs) {
      accounts.adjustBalance(ws, leg.accountId(), leg.direction() * leg.amount());
    }
    List<UUID> ids = legs.stream().map(Raw::id).toList();
    transactions.undelete(ws, ids);
    revisions.markDeletesUndone(ids);
  }

  private void revertUpdate(UUID ws, UUID actor, UUID id, TransactionView old) {
    Raw cur = lockOrFail(ws, id);
    if ("TRANSFER".equals(cur.type())) {
      transactions.updateTransferMeta(ws, cur.transferId(), old.occurredOn(), old.note(), actor);
      return;
    }
    accounts.adjustBalance(ws, cur.accountId(), -cur.direction() * cur.amount());
    accounts.adjustBalance(ws, old.accountId(), old.direction() * old.amountMinor());
    transactions.applySnapshot(ws, old, actor);
    transactions.replaceTags(id, old.tagIds());
  }

  // ---------- normalised (base-currency) amount ----------

  /** Lets the user set the base-currency value themselves instead of the day's rate. */
  public TransactionView setNormalised(UUID ws, UUID actor, UUID id, long baseMinor) {
    db.tx(
        () -> {
          TransactionView before = get(ws, id);
          guardConvertible(before);
          Normalised manual =
              normaliser.manual(
                  normaliser.baseCurrency(ws), before.currency(), before.amountMinor(), baseMinor);
          revisions.record(ws, actor, "UPDATE", before);
          transactions.setNormalised(ws, id, manual);
        });
    audit.record(ws, actor, "transaction", id, "NORMALISED", "manual " + baseMinor);
    return get(ws, id);
  }

  /** Goes back to the rate of the transaction's day. */
  public TransactionView resetNormalised(UUID ws, UUID actor, UUID id) {
    db.tx(
        () -> {
          TransactionView before = get(ws, id);
          guardConvertible(before);
          Normalised computed =
              normaliser.compute(ws, before.currency(), before.amountMinor(), before.occurredOn());
          if (computed.amountMinor() == null) {
            throw new BusinessRuleException("No exchange rate available for " + before.currency());
          }
          revisions.record(ws, actor, "UPDATE", before);
          transactions.setNormalised(ws, id, computed);
        });
    return get(ws, id);
  }

  private static void guardConvertible(TransactionView v) {
    if ("TRANSFER".equals(v.type())) {
      throw new BadRequestException("Transfers are not part of income or spending reports");
    }
  }

  // ---------- helpers ----------

  /**
   * What moves the balance (account currency) plus the amount as the user entered it, if different.
   */
  private record Amounts(long accountMinor, Long origMinor, String origCurrency) {}

  private Amounts resolveAmounts(Account account, TransactionController.Request r) {
    String entered = r.currency() == null ? account.currency() : r.currency().toUpperCase();
    if (entered.equals(account.currency())) {
      return new Amounts(r.amountMinor(), null, null);
    }
    if (r.accountAmountMinor() != null) {
      return new Amounts(r.accountAmountMinor(), r.amountMinor(), entered);
    }
    long converted =
        fx.convert(r.amountMinor(), entered, account.currency())
            .orElseThrow(
                () ->
                    new BusinessRuleException(
                        "No exchange rate for "
                            + entered
                            + " to "
                            + account.currency()
                            + " yet. Enter the amount in "
                            + account.currency()
                            + " instead."));
    return new Amounts(converted, r.amountMinor(), entered);
  }

  private Raw lockOrFail(UUID ws, UUID id) {
    return transactions
        .lock(ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Transaction", id.toString()));
  }

  public void deleteOne(UUID ws, UUID actor, UUID id) {
    Raw cur = transactions.lock(ws, id).orElse(null);
    if (cur == null) return; // already gone: deletes are idempotent
    List<Raw> legs =
        cur.transferId() == null
            ? List.of(cur)
            : transactions.lockTransferLegs(ws, cur.transferId());
    for (Raw leg : legs) {
      transactions.find(ws, leg.id()).ifPresent(v -> revisions.record(ws, actor, "DELETE", v));
      accounts.adjustBalance(ws, leg.accountId(), -leg.direction() * leg.amount());
    }
    transactions.softDelete(ws, legs.stream().map(Raw::id).toList());
  }

  /** Returns the category to store: the given one, or the payee's default when none was chosen. */
  private UUID validateCategoryAndPayee(UUID ws, TransactionController.Request r) {
    refs.payee(ws, r.payeeId());
    UUID categoryId = r.categoryId();
    if (categoryId == null && r.payeeId() != null) {
      categoryId =
          payees
              .defaultCategory(ws, r.payeeId())
              .flatMap(id -> categories.find(ws, id))
              .filter(c -> c.kind().equals(r.type()))
              .map(Category::id)
              .orElse(null);
    }
    if (categoryId != null) {
      Category c =
          categories
              .find(ws, categoryId)
              .orElseThrow(() -> new BadRequestException("Unknown category"));
      if (!c.kind().equals(r.type())) {
        throw new BadRequestException("Category kind " + c.kind() + " does not match " + r.type());
      }
    }
    return categoryId;
  }

  private List<UUID> validTags(UUID ws, List<UUID> tagIds) {
    if (tagIds == null) return List.of();
    tagIds.forEach(t -> refs.tag(ws, t));
    return tagIds;
  }

  private static String clean(String note) {
    return note == null || note.isBlank() ? null : note.trim();
  }
}

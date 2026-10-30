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
import com.keeper.common.exception.ConflictException;
import com.keeper.common.exception.ResourceNotFoundException;
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
  private final RefChecks refs;
  private final Audit audit;
  private final Db db;

  public TransactionService(
      TransactionRepository transactions,
      AccountRepository accounts,
      CategoryRepository categories,
      PayeeRepository payees,
      TransferFactory transfers,
      RefChecks refs,
      Audit audit,
      Db db) {
    this.transactions = transactions;
    this.accounts = accounts;
    this.categories = categories;
    this.payees = payees;
    this.transfers = transfers;
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
    UUID id = db.tx(() -> insertEntry(ws, actor, idempotencyKey, r, null, null, null));
    audit.record(ws, actor, "transaction", id, "CREATE", r.type() + " " + r.amountMinor());
    return get(ws, id);
  }

  /** Shared by manual entry, recurring postings and CSV import. */
  public UUID insertEntry(
      UUID ws,
      UUID actor,
      String idempotencyKey,
      TransactionController.Request r,
      UUID recurringRuleId,
      String importHash,
      UUID importBatchId) {
    Account account =
        accounts
            .find(ws, r.accountId())
            .orElseThrow(() -> new BadRequestException("Unknown account"));
    UUID categoryId = validateCategoryAndPayee(ws, r);
    int direction = "INCOME".equals(r.type()) ? 1 : -1;
    UUID id =
        transactions.insert(
            new Insert(
                ws,
                account.id(),
                r.type(),
                direction,
                r.amountMinor(),
                account.currency(),
                r.occurredOn(),
                categoryId,
                r.payeeId(),
                clean(r.note()),
                null,
                recurringRuleId,
                importHash,
                importBatchId,
                idempotencyKey,
                actor));
    transactions.replaceTags(id, validTags(ws, r.tagIds()));
    accounts.adjustBalance(ws, account.id(), direction * r.amountMinor());
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
          Raw cur =
              transactions
                  .lock(ws, id)
                  .orElseThrow(() -> new ResourceNotFoundException("Transaction", id.toString()));
          if (r.expectedVersion() != null && r.expectedVersion() != cur.version()) {
            throw new ConflictException("This transaction was changed by someone else");
          }
          if ("TRANSFER".equals(cur.type())) {
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
          accounts.adjustBalance(ws, cur.accountId(), -cur.direction() * cur.amount());
          accounts.adjustBalance(ws, account.id(), direction * r.amountMinor());
          transactions.update(
              ws,
              id,
              account.id(),
              r.type(),
              direction,
              r.amountMinor(),
              account.currency(),
              r.occurredOn(),
              categoryId,
              r.payeeId(),
              clean(r.note()),
              actor);
          transactions.replaceTags(id, validTags(ws, r.tagIds()));
        });
    audit.record(ws, actor, "transaction", id, "UPDATE", r.type() == null ? "" : r.type());
    return get(ws, id);
  }

  public void delete(UUID ws, UUID actor, UUID id) {
    db.tx(() -> deleteOne(ws, id));
    audit.record(ws, actor, "transaction", id, "DELETE", "");
  }

  public int bulkDelete(UUID ws, UUID actor, List<UUID> ids) {
    db.tx(() -> ids.forEach(id -> deleteOne(ws, id)));
    audit.record(ws, actor, "transaction", null, "BULK_DELETE", ids.size() + " transactions");
    return ids.size();
  }

  public int bulkRecategorize(UUID ws, UUID actor, List<UUID> ids, UUID categoryId) {
    refs.category(ws, categoryId);
    int n = transactions.recategorize(ws, ids, categoryId);
    audit.record(ws, actor, "transaction", null, "BULK_RECATEGORIZE", n + " transactions");
    return n;
  }

  // ---------- helpers ----------

  private void deleteOne(UUID ws, UUID id) {
    Raw cur = transactions.lock(ws, id).orElse(null);
    if (cur == null) return; // already gone: deletes are idempotent
    List<Raw> legs =
        cur.transferId() == null
            ? List.of(cur)
            : transactions.lockTransferLegs(ws, cur.transferId());
    for (Raw leg : legs) {
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

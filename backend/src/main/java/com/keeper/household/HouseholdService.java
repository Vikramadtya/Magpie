package com.keeper.household;

import com.keeper.account.AccountRepository;
import com.keeper.audit.Audit;
import com.keeper.category.Category;
import com.keeper.category.CategoryRepository;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.common.exception.ConflictException;
import com.keeper.common.exception.ForbiddenException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.payee.PayeeRepository;
import com.keeper.security.Role;
import com.keeper.transaction.EntryOrigin;
import com.keeper.transaction.Normalised;
import com.keeper.transaction.Normaliser;
import com.keeper.transaction.TransactionController;
import com.keeper.transaction.TransactionRepository;
import com.keeper.transaction.TransactionService;
import com.keeper.transaction.TransactionView;
import com.keeper.workspace.WorkspaceRepository;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * A household ledger is a shared workspace. A personal expense can be shared into it: a linked copy
 * is recorded there (attributed to whoever spent it) and follows later edits, deletes and undos.
 */
@Singleton
public class HouseholdService {
  static final String POOL_ACCOUNT = "Household spending";

  private final TransactionRepository transactions;
  private final TransactionService transactionService;
  private final AccountRepository accounts;
  private final CategoryRepository categories;
  private final PayeeRepository payees;
  private final WorkspaceRepository workspaces;
  private final Normaliser normaliser;
  private final Audit audit;
  private final Db db;

  public HouseholdService(
      TransactionRepository transactions,
      TransactionService transactionService,
      AccountRepository accounts,
      CategoryRepository categories,
      PayeeRepository payees,
      WorkspaceRepository workspaces,
      Normaliser normaliser,
      Audit audit,
      Db db) {
    this.transactions = transactions;
    this.transactionService = transactionService;
    this.accounts = accounts;
    this.categories = categories;
    this.payees = payees;
    this.workspaces = workspaces;
    this.normaliser = normaliser;
    this.audit = audit;
    this.db = db;
  }

  // ---------- share / unshare ----------

  public TransactionView share(UUID personalWs, UUID actor, UUID txId, UUID householdWs) {
    if (personalWs.equals(householdWs)) throw new BadRequestException("Choose a household");
    requireHouseholdEditor(householdWs, actor);
    TransactionView src =
        transactions
            .find(personalWs, txId)
            .orElseThrow(() -> new ResourceNotFoundException("Transaction", txId.toString()));
    if (!"EXPENSE".equals(src.type()) || src.loanId() != null || src.sharedCopy()) {
      throw new BusinessRuleException("Only your own expenses can be shared with a household");
    }
    if (src.sharedGroupId() != null) {
      throw new ConflictException("This expense is already shared");
    }
    UUID groupId = UUID.randomUUID();
    db.tx(
        () -> {
          createCopy(householdWs, src, groupId);
          transactions.setSharedGroup(personalWs, txId, groupId);
        });
    audit.record(personalWs, actor, "transaction", txId, "SHARE", "to household");
    return transactions.find(personalWs, txId).orElseThrow();
  }

  /** Removes the household copy and detaches the personal transaction. */
  public TransactionView unshare(UUID personalWs, UUID actor, UUID txId) {
    TransactionView src =
        transactions
            .find(personalWs, txId)
            .orElseThrow(() -> new ResourceNotFoundException("Transaction", txId.toString()));
    UUID group = src.sharedGroupId();
    if (group == null || src.sharedCopy())
      throw new BadRequestException("This expense is not shared");
    db.tx(
        () -> {
          transactions
              .copyOf(group)
              .filter(c -> !c.deleted())
              .ifPresent(c -> transactionService.deleteOne(c.workspaceId(), actor, c.id(), true));
          transactions.setSharedGroup(personalWs, txId, null);
        });
    audit.record(personalWs, actor, "transaction", txId, "UNSHARE", "");
    return transactions.find(personalWs, txId).orElseThrow();
  }

  /** Brings the household copy in line after the personal transaction changed. */
  public void resync(UUID personalWs, UUID txId) {
    Optional<UUID> group = transactions.groupIdOf(personalWs, txId);
    if (group.isEmpty()) return;
    Optional<TransactionView> src = transactions.find(personalWs, txId);
    Optional<TransactionRepository.CopyRef> copy = transactions.copyOf(group.get());
    if (src.isEmpty()) { // personal one was deleted
      copy.filter(c -> !c.deleted())
          .ifPresent(c -> transactionService.deleteOne(c.workspaceId(), src(c), c.id(), true));
      return;
    }
    if (copy.isEmpty()) return;
    var ref = copy.get();
    db.tx(
        () -> {
          if (ref.deleted()) { // personal one was restored: record a fresh copy
            createCopy(ref.workspaceId(), src.get(), group.get());
          } else {
            updateCopy(ref, src.get());
          }
        });
  }

  private UUID src(TransactionRepository.CopyRef c) {
    return db.one(
            "SELECT created_by FROM transactions WHERE id = ?",
            rs -> rs.getObject(1, UUID.class),
            c.id())
        .orElse(null);
  }

  private void createCopy(UUID householdWs, TransactionView src, UUID groupId) {
    String base = normaliser.baseCurrency(householdWs);
    Normalised amount =
        normaliser.compute(base, src.currency(), src.amountMinor(), src.occurredOn());
    if (amount.amountMinor() == null) {
      throw new BusinessRuleException(
          "No exchange rate for " + src.currency() + " to " + base + " yet, so it can't be shared");
    }
    UUID pool = poolAccount(householdWs, base);
    var request =
        new TransactionController.Request(
            pool,
            "EXPENSE",
            amount.amountMinor(),
            src.occurredOn(),
            mapCategory(householdWs, src.categoryName()),
            src.payeeName() == null ? null : payees.upsert(householdWs, src.payeeName(), null).id(),
            src.note(),
            List.of(),
            null,
            null);
    transactionService.insertEntry(
        householdWs, src.createdBy(), null, request, EntryOrigin.sharedCopy(groupId));
  }

  private void updateCopy(TransactionRepository.CopyRef ref, TransactionView src) {
    String base = normaliser.baseCurrency(ref.workspaceId());
    Normalised amount =
        normaliser.compute(base, src.currency(), src.amountMinor(), src.occurredOn());
    if (amount.amountMinor() == null) return; // keep the old copy until a rate exists
    long newAmount = amount.amountMinor();
    accounts.adjustBalance(ref.workspaceId(), ref.accountId(), -ref.direction() * ref.amount());
    accounts.adjustBalance(ref.workspaceId(), ref.accountId(), -1L * newAmount);
    transactions.update(
        ref.workspaceId(),
        ref.id(),
        ref.accountId(),
        "EXPENSE",
        -1,
        newAmount,
        base,
        src.occurredOn(),
        mapCategory(ref.workspaceId(), src.categoryName()),
        src.payeeName() == null
            ? null
            : payees.upsert(ref.workspaceId(), src.payeeName(), null).id(),
        src.note(),
        src.createdBy(),
        null,
        null,
        new Normalised(newAmount, base, BigDecimal.ONE, false));
  }

  /** The household's own category with the same name, if it has one. */
  private UUID mapCategory(UUID householdWs, String name) {
    if (name == null) return null;
    return categories.findAll(householdWs).stream()
        .filter(c -> "EXPENSE".equals(c.kind()) && c.name().equalsIgnoreCase(name))
        .map(Category::id)
        .findFirst()
        .orElse(null);
  }

  private UUID poolAccount(UUID householdWs, String currency) {
    return db.one(
            "SELECT id FROM accounts WHERE workspace_id = ? AND name = ? LIMIT 1",
            rs -> rs.getObject(1, UUID.class),
            householdWs,
            POOL_ACCOUNT)
        .orElseGet(() -> accounts.insert(householdWs, POOL_ACCOUNT, "OTHER", currency, 0));
  }

  private void requireHouseholdEditor(UUID householdWs, UUID actor) {
    Role role =
        workspaces
            .roleOf(householdWs, actor)
            .orElseThrow(() -> new ForbiddenException("You are not a member of that household"));
    if (!role.atLeast(Role.EDITOR))
      throw new ForbiddenException("You can only view that household");
    String kind =
        db.one("SELECT kind FROM workspaces WHERE id = ?", rs -> rs.getString(1), householdWs)
            .orElse("PERSONAL");
    if (!"HOUSEHOLD".equals(kind))
      throw new BadRequestException("That workspace is not a household");
  }
}

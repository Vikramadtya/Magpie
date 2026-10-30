package com.keeper.recurring;

import com.keeper.account.AccountRepository;
import com.keeper.common.RefChecks;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.transaction.EntryOrigin;
import com.keeper.transaction.TransactionController;
import com.keeper.transaction.TransactionRepository;
import com.keeper.transaction.TransactionService;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Singleton
public class RecurringService {
  private static final int MAX_CATCH_UP = 366;

  @io.micronaut.serde.annotation.Serdeable
  public record Upcoming(
      UUID ruleId,
      String name,
      String type,
      long amountMinor,
      String currency,
      LocalDate date,
      boolean autoPost) {}

  private final RecurringRepository rules;
  private final TransactionService transactions;
  private final TransactionRepository transactionRepo;
  private final AccountRepository accounts;
  private final RefChecks refs;
  private final Db db;

  public RecurringService(
      RecurringRepository rules,
      TransactionService transactions,
      TransactionRepository transactionRepo,
      AccountRepository accounts,
      RefChecks refs,
      Db db) {
    this.rules = rules;
    this.transactions = transactions;
    this.transactionRepo = transactionRepo;
    this.accounts = accounts;
    this.refs = refs;
    this.db = db;
  }

  public List<RecurringRule> list(UUID ws) {
    return rules.findAll(ws);
  }

  public RecurringRule create(UUID ws, UUID actor, RecurringController.Request r) {
    validate(ws, r);
    return rules.find(ws, rules.insert(ws, actor, withAccountCurrency(ws, r))).orElseThrow();
  }

  public RecurringRule update(UUID ws, UUID id, RecurringController.Request r) {
    get(ws, id);
    validate(ws, r);
    rules.update(ws, id, withAccountCurrency(ws, r));
    return get(ws, id);
  }

  public RecurringRule get(UUID ws, UUID id) {
    return rules
        .find(ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Recurring rule", id.toString()));
  }

  public void setStatus(UUID ws, UUID id, String status) {
    get(ws, id);
    rules.setStatus(ws, id, status);
  }

  public void delete(UUID ws, UUID id) {
    rules.delete(ws, id);
  }

  /** Posts the next occurrence immediately, whether or not the rule auto-posts. */
  public RecurringRule postNow(UUID ws, UUID actor, UUID id) {
    db.tx(() -> postOccurrence(get(ws, id), actor, true));
    return get(ws, id);
  }

  /** Occurrences falling in [today, today + days], for the "upcoming bills" widget. */
  public List<Upcoming> upcoming(UUID ws, int days) {
    LocalDate today = LocalDate.now();
    LocalDate until = today.plusDays(days);
    List<Upcoming> result = new ArrayList<>();
    for (RecurringRule rule : rules.findAll(ws)) {
      if (!"ACTIVE".equals(rule.status())) continue;
      LocalDate date = rule.nextRunOn();
      for (int guard = 0; !date.isAfter(until) && guard < 400; guard++) {
        if (rule.endOn() != null && date.isAfter(rule.endOn())) break;
        if (!date.isBefore(today)) {
          result.add(
              new Upcoming(
                  rule.id(),
                  rule.name(),
                  rule.type(),
                  rule.amountMinor(),
                  rule.currency(),
                  date,
                  rule.autoPost()));
        }
        date = rule.frequency().next(date, rule.intervalN(), rule.anchorDay());
      }
    }
    result.sort(java.util.Comparator.comparing(Upcoming::date));
    return result;
  }

  /** Daily job body: catches up every missed occurrence of each due rule. Returns postings made. */
  public int postDue(LocalDate today) {
    int posted = 0;
    List<RecurringRule> due = db.tx(() -> rules.lockDue(today));
    for (RecurringRule rule : due) {
      posted +=
          db.tx(
              () -> {
                RecurringRule current =
                    rules.find(rules.workspaceOf(rule.id()), rule.id()).orElse(null);
                if (current == null) return 0;
                int n = 0;
                UUID actor = rules.createdBy(current.id());
                while (n < MAX_CATCH_UP
                    && !current.nextRunOn().isAfter(today)
                    && "ACTIVE".equals(current.status())) {
                  postOccurrence(current, actor, false);
                  current = rules.find(rules.workspaceOf(rule.id()), rule.id()).orElseThrow();
                  n++;
                }
                return n;
              });
    }
    return posted;
  }

  /**
   * Creates the transaction for the rule's next date and advances the rule. Idempotent per date.
   */
  private void postOccurrence(RecurringRule rule, UUID actor, boolean manual) {
    UUID ws = rules.workspaceOf(rule.id());
    LocalDate date = rule.nextRunOn();
    LocalDate next = rule.frequency().next(date, rule.intervalN(), rule.anchorDay());
    boolean finished = rule.endOn() != null && next.isAfter(rule.endOn());
    if (rule.endOn() == null || !date.isAfter(rule.endOn())) {
      if (!transactionRepo.existsRecurringPosting(rule.id(), date)) {
        var request =
            new TransactionController.Request(
                rule.accountId(),
                rule.type(),
                rule.amountMinor(),
                date,
                rule.categoryId(),
                rule.payeeId(),
                rule.name(),
                List.of(),
                null,
                null,
                null);
        transactions.insertEntry(
            ws, actor, "rule:" + rule.id() + ":" + date, request, EntryOrigin.recurring(rule.id()));
      }
    }
    rules.advance(rule.id(), next, finished);
  }

  private void validate(UUID ws, RecurringController.Request r) {
    refs.account(ws, r.accountId());
    refs.category(ws, r.categoryId());
    refs.payee(ws, r.payeeId());
    if (r.endOn() != null && r.endOn().isBefore(r.startOn())) {
      throw new BadRequestException("endOn must not be before startOn");
    }
  }

  private RecurringController.Request withAccountCurrency(UUID ws, RecurringController.Request r) {
    String currency = accounts.find(ws, r.accountId()).orElseThrow().currency();
    return new RecurringController.Request(
        r.name(),
        r.accountId(),
        r.categoryId(),
        r.payeeId(),
        r.type(),
        r.amountMinor(),
        currency,
        r.frequency(),
        r.intervalN(),
        r.startOn(),
        r.endOn(),
        r.autoPost());
  }
}

package com.keeper.loan;

import com.keeper.account.Account;
import com.keeper.account.AccountRepository;
import com.keeper.audit.Audit;
import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.fx.FxConverter;
import com.keeper.payee.PayeeRepository;
import com.keeper.transaction.EntryOrigin;
import com.keeper.transaction.TransactionController;
import com.keeper.transaction.TransactionRepository;
import com.keeper.transaction.TransactionService;
import com.keeper.transaction.TransactionView;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Money borrowed from, or lent to, a person. Each loan and repayment is a real transaction (so
 * balances stay right) linked to the loan, and is kept out of income/spending reports.
 */
@Singleton
public class LoanService {

  @Serdeable
  public record Loan(
      UUID id,
      String person,
      String direction,
      long principalMinor,
      String currency,
      LocalDate occurredOn,
      LocalDate dueOn,
      String note,
      long repaidMinor,
      long outstandingMinor,
      String status) {}

  /** Net position with one person in the base currency: positive = they owe you. */
  @Serdeable
  public record Person(String person, long netMinor, int openLoans) {}

  @Serdeable
  public record Overview(
      String currency, long owedToMeMinor, long iOweMinor, List<Person> people, List<Loan> loans) {}

  @Serdeable
  public record Detail(Loan loan, List<TransactionView> transactions) {}

  private final LoanRepository loans;
  private final AccountRepository accounts;
  private final PayeeRepository payees;
  private final TransactionService transactions;
  private final TransactionRepository transactionRepo;
  private final FxConverter fx;
  private final Audit audit;
  private final Db db;

  public LoanService(
      LoanRepository loans,
      AccountRepository accounts,
      PayeeRepository payees,
      TransactionService transactions,
      TransactionRepository transactionRepo,
      FxConverter fx,
      Audit audit,
      Db db) {
    this.loans = loans;
    this.accounts = accounts;
    this.payees = payees;
    this.transactions = transactions;
    this.transactionRepo = transactionRepo;
    this.fx = fx;
    this.audit = audit;
    this.db = db;
  }

  public Overview overview(UUID ws) {
    var converter = fx.forWorkspace(ws);
    List<Loan> all = loans.findAll(ws).stream().map(LoanService::toLoan).toList();
    Map<String, long[]> byPerson = new LinkedHashMap<>();
    long owedToMe = 0;
    long iOwe = 0;
    for (Loan l : all) {
      if (l.outstandingMinor() <= 0) continue;
      long inBase = converter.toBase(l.outstandingMinor(), l.currency());
      boolean lent = "LENT".equals(l.direction());
      if (lent) owedToMe += inBase;
      else iOwe += inBase;
      long[] slot = byPerson.computeIfAbsent(l.person().toLowerCase(), k -> new long[2]);
      slot[0] += lent ? inBase : -inBase;
      slot[1]++;
    }
    Map<String, String> display = new LinkedHashMap<>();
    all.forEach(l -> display.putIfAbsent(l.person().toLowerCase(), l.person()));
    List<Person> people =
        byPerson.entrySet().stream()
            .map(e -> new Person(display.get(e.getKey()), e.getValue()[0], (int) e.getValue()[1]))
            .toList();
    return new Overview(converter.base(), owedToMe, iOwe, people, all);
  }

  /**
   * Open loans you lent to a person (oldest first), in one currency: where an incoming repayment
   * goes.
   */
  public List<Loan> openLentTo(UUID ws, String person, String currency) {
    return loans.findAll(ws).stream()
        .map(LoanService::toLoan)
        .filter(l -> "LENT".equals(l.direction()) && l.outstandingMinor() > 0)
        .filter(l -> l.person().equalsIgnoreCase(person.trim()) && l.currency().equals(currency))
        .sorted(java.util.Comparator.comparing(Loan::occurredOn))
        .toList();
  }

  public Detail detail(UUID ws, UUID id) {
    return new Detail(get(ws, id), transactionRepo.findByLoan(ws, id));
  }

  public Loan create(UUID ws, UUID actor, LoanController.CreateRequest r) {
    Account account =
        accounts
            .find(ws, r.accountId())
            .orElseThrow(() -> new BadRequestException("Unknown account"));
    String person = r.person().trim();
    boolean borrowed = "BORROWED".equals(r.direction());
    UUID id =
        db.tx(
            () -> {
              UUID loanId =
                  loans.insert(
                      ws,
                      actor,
                      person,
                      r.direction(),
                      r.amountMinor(),
                      account.currency(),
                      r.occurredOn(),
                      r.dueOn(),
                      clean(r.note()));
              transactions.insertEntry(
                  ws,
                  actor,
                  null,
                  entry(
                      account,
                      borrowed ? "INCOME" : "EXPENSE",
                      r.amountMinor(),
                      r.occurredOn(),
                      (borrowed ? "Borrowed from " : "Lent to ") + person,
                      person,
                      ws),
                  EntryOrigin.loan(loanId));
              return loanId;
            });
    audit.record(
        ws, actor, "loan", id, "CREATE", (borrowed ? "borrowed from " : "lent to ") + person);
    return get(ws, id);
  }

  /** A repayment: you paying back what you borrowed, or them paying back what you lent. */
  public Loan repay(UUID ws, UUID actor, UUID loanId, LoanController.PaymentRequest r) {
    repayTx(ws, actor, loanId, r);
    return get(ws, loanId);
  }

  /** Records a repayment and returns the id of the transaction it created. */
  public UUID repayTx(UUID ws, UUID actor, UUID loanId, LoanController.PaymentRequest r) {
    Loan loan = get(ws, loanId);
    Account account =
        accounts
            .find(ws, r.accountId())
            .orElseThrow(() -> new BadRequestException("Unknown account"));
    if (!account.currency().equals(loan.currency())) {
      throw new BusinessRuleException(
          "This loan is in " + loan.currency() + "; pay from a " + loan.currency() + " account");
    }
    if (r.amountMinor() > loan.outstandingMinor()) {
      throw new BusinessRuleException("That is more than the outstanding amount");
    }
    boolean borrowed = "BORROWED".equals(loan.direction());
    UUID txId =
        db.tx(
            () ->
                transactions.insertEntry(
                    ws,
                    actor,
                    null,
                    entry(
                        account,
                        borrowed ? "EXPENSE" : "INCOME",
                        r.amountMinor(),
                        r.occurredOn(),
                        clean(r.note()) != null
                            ? clean(r.note())
                            : (borrowed ? "Repaid " : "Repayment from ") + loan.person(),
                        loan.person(),
                        ws),
                    EntryOrigin.loan(loanId)));
    audit.record(ws, actor, "loan", loanId, "REPAYMENT", loan.person());
    return txId;
  }

  /** Removes the loan and every transaction linked to it (each stays individually undoable). */
  public void delete(UUID ws, UUID actor, UUID loanId) {
    Loan loan = get(ws, loanId);
    db.tx(
        () -> {
          for (TransactionView t : transactionRepo.findByLoan(ws, loanId)) {
            transactions.deleteOne(ws, actor, t.id());
          }
          loans.markDeleted(ws, loanId);
        });
    audit.record(ws, actor, "loan", loanId, "DELETE", loan.person());
  }

  private Loan get(UUID ws, UUID id) {
    return loans
        .find(ws, id)
        .map(LoanService::toLoan)
        .orElseThrow(() -> new ResourceNotFoundException("Loan", id.toString()));
  }

  private TransactionController.Request entry(
      Account account,
      String type,
      long amount,
      LocalDate date,
      String note,
      String person,
      UUID ws) {
    UUID payeeId = payees.upsert(ws, person, null).id();
    return new TransactionController.Request(
        account.id(), type, amount, date, null, payeeId, note, List.of(), null, null, null);
  }

  private static Loan toLoan(LoanRepository.Row r) {
    long outstanding = Math.max(0, r.principalMinor() - r.repaidMinor());
    return new Loan(
        r.id(),
        r.person(),
        r.direction(),
        r.principalMinor(),
        r.currency(),
        r.occurredOn(),
        r.dueOn(),
        r.note(),
        r.repaidMinor(),
        outstanding,
        outstanding == 0 ? "SETTLED" : "OPEN");
  }

  private static String clean(String s) {
    return s == null || s.isBlank() ? null : s.trim();
  }
}

package com.keeper.dashboard;

import com.keeper.account.Account;
import com.keeper.account.AccountRepository;
import com.keeper.budget.BudgetService;
import com.keeper.common.CursorPage;
import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import com.keeper.recurring.RecurringService;
import com.keeper.transaction.TransactionFilter;
import com.keeper.transaction.TransactionService;
import com.keeper.transaction.TransactionView;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

/** Everything the home screen needs in a single response (one round trip). */
@Singleton
public class DashboardService {

  @Serdeable
  public record Dashboard(
      String month,
      String currency,
      long netWorthMinor,
      long assetsMinor,
      long liabilitiesMinor,
      long incomeMinor,
      long expenseMinor,
      int savingsRatePercent,
      List<Account> accounts,
      List<TransactionView> recent,
      BudgetService.Summary budgets,
      List<RecurringService.Upcoming> upcoming,
      List<String> missingCurrencies) {}

  private final AccountRepository accounts;
  private final TransactionService transactions;
  private final BudgetService budgets;
  private final RecurringService recurring;
  private final FxConverter fx;
  private final com.keeper.analytics.MissingRates missingRates;
  private final Db db;

  public DashboardService(
      AccountRepository accounts,
      TransactionService transactions,
      BudgetService budgets,
      RecurringService recurring,
      FxConverter fx,
      com.keeper.analytics.MissingRates missingRates,
      Db db) {
    this.accounts = accounts;
    this.transactions = transactions;
    this.budgets = budgets;
    this.recurring = recurring;
    this.fx = fx;
    this.missingRates = missingRates;
    this.db = db;
  }

  public Dashboard load(UUID ws, YearMonth month) {
    var converter = fx.forWorkspace(ws);
    List<Account> all = accounts.findAll(ws, false);

    long assets = 0;
    long liabilities = 0;
    for (Account a : all) {
      long inBase = converter.toBase(a.balanceMinor(), a.currency());
      if (a.balanceMinor() >= 0 && !isLiability(a)) assets += inBase;
      else liabilities += inBase;
    }

    AtomicLong income = new AtomicLong();
    AtomicLong expense = new AtomicLong();
    db.list(
        "SELECT type, SUM(base_amount_minor) FROM transactions WHERE workspace_id = ? AND deleted_at IS NULL "
            + "AND loan_id IS NULL AND base_amount_minor IS NOT NULL "
            + "AND type IN ('INCOME','EXPENSE') AND occurred_on BETWEEN ? AND ? GROUP BY type",
        rs -> {
          long v = rs.getLong(2);
          ("INCOME".equals(rs.getString(1)) ? income : expense).addAndGet(v);
          return null;
        },
        ws,
        month.atDay(1),
        month.atEndOfMonth());

    CursorPage<TransactionView> recent =
        transactions.list(
            ws,
            new TransactionFilter(null, null, null, null, null, null, null, null, null),
            null,
            8);
    int savings =
        income.get() > 0 ? (int) ((income.get() - expense.get()) * 100 / income.get()) : 0;

    return new Dashboard(
        month.toString(),
        converter.base(),
        assets + liabilities,
        assets,
        liabilities,
        income.get(),
        expense.get(),
        savings,
        all,
        recent.items(),
        budgets.summary(ws, month),
        recurring.upcoming(ws, 14),
        mergeMissing(
            converter.missing(),
            missingRates.currencies(ws, month.atDay(1), month.atEndOfMonth())));
  }

  private static List<String> mergeMissing(java.util.Set<String> a, List<String> b) {
    java.util.TreeSet<String> all = new java.util.TreeSet<>(a);
    all.addAll(b);
    return List.copyOf(all);
  }

  private static boolean isLiability(Account a) {
    return "CREDIT_CARD".equals(a.type()) || "LOAN".equals(a.type());
  }
}

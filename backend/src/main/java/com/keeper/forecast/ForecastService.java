package com.keeper.forecast;

import com.keeper.analytics.MissingRates;
import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import com.keeper.recurring.RecurringRepository;
import com.keeper.recurring.RecurringRule;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Next month's money: fixed amounts come from recurring rules; the variable part is forecast per
 * category from history (see {@link Forecaster}).
 */
@Singleton
public class ForecastService {
  private static final int HISTORY_MONTHS = 24;

  @Serdeable
  public record Line(
      long fixedMinor, long variableMinor, long totalMinor, long lowMinor, long highMinor) {}

  @Serdeable
  public record CategoryForecast(
      UUID categoryId,
      String name,
      String color,
      long forecastMinor,
      long lowMinor,
      long highMinor,
      String method,
      String confidence,
      int months,
      long lastMonthMinor,
      long averageMinor) {}

  @Serdeable
  public record FixedItem(UUID ruleId, String name, long amountMinor, LocalDate date) {}

  @Serdeable
  public record ThisMonth(
      long spentMinor, long projectedMinor, long expectedMinor, int daysElapsed, int daysInMonth) {}

  @Serdeable
  public record Forecast(
      String month,
      String currency,
      Line expense,
      Line income,
      long netMinor,
      List<CategoryForecast> categories,
      List<FixedItem> fixedExpenses,
      List<FixedItem> fixedIncome,
      int monthsOfHistory,
      String confidence,
      ThisMonth thisMonth,
      List<String> missingCurrencies) {}

  private final HistoryRepository history;
  private final RecurringRepository rules;
  private final FxConverter fx;
  private final MissingRates missingRates;
  private final Db db;

  public ForecastService(
      HistoryRepository history,
      RecurringRepository rules,
      FxConverter fx,
      MissingRates missingRates,
      Db db) {
    this.history = history;
    this.rules = rules;
    this.fx = fx;
    this.missingRates = missingRates;
    this.db = db;
  }

  public Forecast forecast(UUID ws) {
    var converter = fx.forWorkspace(ws);
    YearMonth now = YearMonth.now();
    YearMonth next = now.plusMonths(1);
    LocalDate from = now.minusMonths(HISTORY_MONTHS).atDay(1);
    LocalDate firstOfThis = now.atDay(1);

    // ---- history -> per-category monthly series ----
    List<HistoryRepository.MonthGroup> rows = history.monthlyVariableExpense(ws, from, firstOfThis);
    YearMonth firstMonth =
        rows.stream()
            .map(r -> YearMonth.parse(r.month()))
            .min(Comparator.naturalOrder())
            .orElse(now);
    int span = (int) Math.max(0, java.time.temporal.ChronoUnit.MONTHS.between(firstMonth, now));
    Map<UUID, double[]> series = new LinkedHashMap<>();
    Map<UUID, String[]> labels = new HashMap<>();
    UUID uncategorized = new UUID(0, 0);
    for (var r : rows) {
      UUID key = r.groupId() == null ? uncategorized : r.groupId();
      double[] y = series.computeIfAbsent(key, k -> new double[span]);
      labels.putIfAbsent(key, new String[] {r.name(), r.color()});
      int idx =
          (int)
              java.time.temporal.ChronoUnit.MONTHS.between(firstMonth, YearMonth.parse(r.month()));
      if (idx >= 0 && idx < span) y[idx] += r.sumMinor();
    }

    List<CategoryForecast> categories = new ArrayList<>();
    double[] total = new double[span];
    double variable = 0;
    for (var e : series.entrySet()) {
      double[] y = e.getValue();
      for (int i = 0; i < span; i++) total[i] += y[i];
      var res = Forecaster.forecast(y);
      variable += res.value();
      String[] label = labels.get(e.getKey());
      categories.add(
          new CategoryForecast(
              e.getKey().equals(uncategorized) ? null : e.getKey(),
              label[0],
              label[1],
              Math.round(res.value()),
              Math.round(res.low()),
              Math.round(res.high()),
              res.method(),
              res.confidence(),
              res.months(),
              span > 0 ? Math.round(y[span - 1]) : 0,
              Math.round(Forecaster.mean(Forecaster.tail(y, 6)))));
    }
    categories.sort(Comparator.comparingLong(CategoryForecast::forecastMinor).reversed());
    var totalRes = Forecaster.forecast(total);
    long varExpense = Math.round(variable);
    long expLow = Math.max(0, varExpense - Math.round(totalRes.value() - totalRes.low()));
    long expHigh = varExpense + Math.round(totalRes.high() - totalRes.value());

    // ---- variable income ----
    double[] incomeSeries = incomeSeries(ws, from, firstOfThis, firstMonth, span);
    var incomeRes = Forecaster.forecast(incomeSeries);

    // ---- fixed items from recurring rules ----
    List<RecurringRule> active =
        rules.findAll(ws).stream().filter(r -> "ACTIVE".equals(r.status())).toList();
    List<FixedItem> fixedExpenses = new ArrayList<>();
    List<FixedItem> fixedIncome = new ArrayList<>();
    for (RecurringRule rule : active) {
      for (LocalDate d : occurrences(rule, next.atDay(1), next.atEndOfMonth())) {
        var item =
            new FixedItem(
                rule.id(), rule.name(), converter.toBase(rule.amountMinor(), rule.currency()), d);
        ("INCOME".equals(rule.type()) ? fixedIncome : fixedExpenses).add(item);
      }
    }
    fixedExpenses.sort(Comparator.comparing(FixedItem::date));
    fixedIncome.sort(Comparator.comparing(FixedItem::date));
    long fixedExp = fixedExpenses.stream().mapToLong(FixedItem::amountMinor).sum();
    long fixedInc = fixedIncome.stream().mapToLong(FixedItem::amountMinor).sum();

    long varIncome = Math.round(incomeRes.value());
    Line expense =
        new Line(
            fixedExp, varExpense, fixedExp + varExpense, fixedExp + expLow, fixedExp + expHigh);
    Line income =
        new Line(
            fixedInc,
            varIncome,
            fixedInc + varIncome,
            fixedInc + Math.round(incomeRes.low()),
            fixedInc + Math.round(incomeRes.high()));

    String confidence = span < 4 ? "LOW" : span < 9 ? "MEDIUM" : "HIGH";
    ThisMonth thisMonth = thisMonth(ws, converter, active, now, varExpense);
    return new Forecast(
        next.toString(),
        converter.base(),
        expense,
        income,
        income.totalMinor() - expense.totalMinor(),
        categories,
        fixedExpenses,
        fixedIncome,
        span,
        confidence,
        thisMonth,
        missingRates.currencies(ws, from, next.atEndOfMonth()));
  }

  private double[] incomeSeries(
      UUID ws, LocalDate from, LocalDate before, YearMonth firstMonth, int span) {
    double[] y = new double[span];
    for (var r : history.monthlyVariableIncome(ws, from, before)) {
      int idx =
          (int)
              java.time.temporal.ChronoUnit.MONTHS.between(firstMonth, YearMonth.parse(r.month()));
      if (idx >= 0 && idx < span) y[idx] += r.sumMinor();
    }
    return y;
  }

  /** Where this month is heading, from what was spent so far plus what is still due. */
  private ThisMonth thisMonth(
      UUID ws,
      FxConverter.Converter converter,
      List<RecurringRule> active,
      YearMonth now,
      long variableForecast) {
    LocalDate today = LocalDate.now();
    int elapsed = Math.max(1, today.getDayOfMonth());
    int daysInMonth = now.lengthOfMonth();
    long spent =
        db.one(
                "SELECT COALESCE(SUM(base_amount_minor), 0) FROM transactions WHERE workspace_id = ? AND type = 'EXPENSE' "
                    + "AND deleted_at IS NULL AND loan_id IS NULL AND spent_by IS NULL AND base_amount_minor IS NOT NULL AND occurred_on BETWEEN ? AND ?",
                rs -> rs.getLong(1),
                ws,
                now.atDay(1),
                today)
            .orElse(0L);
    long variableSoFar =
        db.one(
                "SELECT COALESCE(SUM(base_amount_minor), 0) FROM transactions WHERE workspace_id = ? AND type = 'EXPENSE' "
                    + "AND deleted_at IS NULL AND loan_id IS NULL AND spent_by IS NULL AND recurring_rule_id IS NULL AND base_amount_minor IS NOT NULL "
                    + "AND occurred_on BETWEEN ? AND ?",
                rs -> rs.getLong(1),
                ws,
                now.atDay(1),
                today)
            .orElse(0L);
    long remainingFixed = 0;
    long monthFixed = 0;
    for (RecurringRule rule : active) {
      if (!"EXPENSE".equals(rule.type())) continue;
      for (LocalDate d : occurrences(rule, now.atDay(1), now.atEndOfMonth())) {
        long v = converter.toBase(rule.amountMinor(), rule.currency());
        monthFixed += v;
        if (d.isAfter(today)) remainingFixed += v;
      }
    }
    long dailyVariable = variableSoFar / elapsed;
    long projected = spent + remainingFixed + dailyVariable * (daysInMonth - elapsed);
    return new ThisMonth(spent, projected, monthFixed + variableForecast, elapsed, daysInMonth);
  }

  /** Dates a rule fires within [from, to], including ones not yet posted. */
  static List<LocalDate> occurrences(RecurringRule rule, LocalDate from, LocalDate to) {
    List<LocalDate> dates = new ArrayList<>();
    LocalDate d = rule.nextRunOn();
    // rules that have been due for a while still step forward from their stored date
    for (int guard = 0; !d.isAfter(to) && guard < 1000; guard++) {
      if (rule.endOn() != null && d.isAfter(rule.endOn())) break;
      if (!d.isBefore(from)) dates.add(d);
      d = rule.frequency().next(d, rule.intervalN(), rule.anchorDay());
    }
    return dates;
  }
}

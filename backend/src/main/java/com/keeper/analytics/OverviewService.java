package com.keeper.analytics;

import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * One call for the analytics overview: how the period compares with the one before it, what changed
 * by category, the biggest purchases, and the monthly mix. Everything is "your own" spending
 * (others' spending on your accounts and loans are left out) in the base currency.
 */
@Singleton
public class OverviewService {
  private static final int STACK_CATEGORIES = 5;
  private static final int MONTHS = 6;

  @Serdeable
  public record Period(
      long incomeMinor,
      long expenseMinor,
      long savingsMinor,
      int savingsRatePercent,
      int expenseCount,
      long avgPerDayMinor) {}

  @Serdeable
  public record CategoryChange(
      UUID categoryId, String name, String color, long currentMinor, long previousMinor) {}

  @Serdeable
  public record Largest(UUID id, LocalDate date, String title, String category, long amountMinor) {}

  @Serdeable
  public record MonthMix(String month, Map<String, Long> byCategory) {}

  @Serdeable
  public record Overview(
      String currency,
      LocalDate from,
      LocalDate to,
      Period current,
      Period previous,
      List<CategoryChange> categoryChanges,
      List<Largest> largest,
      List<String> stackCategories,
      List<MonthMix> monthly,
      List<Long> dailySpend,
      List<String> missingCurrencies) {}

  private final Db db;
  private final FxConverter fx;
  private final AnalyticsService analytics;
  private final MissingRates missing;

  public OverviewService(Db db, FxConverter fx, AnalyticsService analytics, MissingRates missing) {
    this.db = db;
    this.fx = fx;
    this.analytics = analytics;
    this.missing = missing;
  }

  public Overview overview(UUID ws, LocalDate from, LocalDate to) {
    long days = ChronoUnit.DAYS.between(from, to) + 1;
    LocalDate prevTo = from.minusDays(1);
    LocalDate prevFrom = prevTo.minusDays(days - 1);
    String currency = fx.forWorkspace(ws).base();

    var mix = monthlyMix(ws, to);
    return new Overview(
        currency,
        from,
        to,
        period(ws, from, to, days),
        period(ws, prevFrom, prevTo, days),
        changes(ws, from, to, prevFrom, prevTo),
        largest(ws, from, to),
        mix.categories(),
        mix.months(),
        daily(ws, from, to),
        missing.currencies(ws, prevFrom, to));
  }

  private Period period(UUID ws, LocalDate from, LocalDate to, long days) {
    long[] sums = new long[2];
    int[] expenses = new int[1];
    db.list(
        "SELECT type, SUM(base_amount_minor), COUNT(*) FROM transactions WHERE workspace_id = ? "
            + "AND type IN ('INCOME','EXPENSE') AND deleted_at IS NULL AND loan_id IS NULL AND spent_by IS NULL "
            + "AND base_amount_minor IS NOT NULL AND occurred_on BETWEEN ? AND ? GROUP BY type",
        rs -> {
          boolean income = "INCOME".equals(rs.getString(1));
          sums[income ? 0 : 1] = rs.getLong(2);
          if (!income) expenses[0] = rs.getInt(3);
          return null;
        },
        ws,
        from,
        to);
    long saved = sums[0] - sums[1];
    int rate = sums[0] > 0 ? (int) (saved * 100 / sums[0]) : 0;
    return new Period(sums[0], sums[1], saved, rate, expenses[0], sums[1] / Math.max(days, 1));
  }

  private List<CategoryChange> changes(
      UUID ws, LocalDate from, LocalDate to, LocalDate prevFrom, LocalDate prevTo) {
    var now = analytics.spendingByCategory(ws, from, to).items();
    Map<UUID, Long> before = new LinkedHashMap<>();
    analytics
        .spendingByCategory(ws, prevFrom, prevTo)
        .items()
        .forEach(c -> before.put(c.categoryId(), c.totalMinor()));
    Map<UUID, CategoryChange> out = new LinkedHashMap<>();
    now.forEach(
        c ->
            out.put(
                c.categoryId(),
                new CategoryChange(
                    c.categoryId(),
                    c.name(),
                    c.color(),
                    c.totalMinor(),
                    before.getOrDefault(c.categoryId(), 0L))));
    return out.values().stream().limit(8).toList();
  }

  private List<Largest> largest(UUID ws, LocalDate from, LocalDate to) {
    return db.list(
        "SELECT t.id, t.occurred_on, COALESCE(p.name, NULLIF(t.note, ''), c.name, 'Expense'), c.name, t.base_amount_minor "
            + "FROM transactions t LEFT JOIN payees p ON p.id = t.payee_id LEFT JOIN categories c ON c.id = t.category_id "
            + "WHERE t.workspace_id = ? AND t.type = 'EXPENSE' AND t.deleted_at IS NULL AND t.loan_id IS NULL "
            + "AND t.spent_by IS NULL AND t.base_amount_minor IS NOT NULL AND t.occurred_on BETWEEN ? AND ? "
            + "ORDER BY t.base_amount_minor DESC LIMIT 5",
        rs ->
            new Largest(
                rs.getObject(1, UUID.class),
                rs.getObject(2, LocalDate.class),
                rs.getString(3),
                rs.getString(4),
                rs.getLong(5)),
        ws,
        from,
        to);
  }

  private List<Long> daily(UUID ws, LocalDate from, LocalDate to) {
    int days = (int) Math.min(ChronoUnit.DAYS.between(from, to) + 1, 400);
    long[] perDay = new long[days];
    db.list(
        "SELECT occurred_on, SUM(base_amount_minor) FROM transactions WHERE workspace_id = ? AND type = 'EXPENSE' "
            + "AND deleted_at IS NULL AND loan_id IS NULL AND spent_by IS NULL AND base_amount_minor IS NOT NULL "
            + "AND occurred_on BETWEEN ? AND ? GROUP BY 1",
        rs -> {
          int i = (int) ChronoUnit.DAYS.between(from, rs.getObject(1, LocalDate.class));
          if (i >= 0 && i < days) perDay[i] = rs.getLong(2);
          return null;
        },
        ws,
        from,
        to);
    List<Long> out = new ArrayList<>(days);
    for (long v : perDay) out.add(v);
    return out;
  }

  private record Mix(List<String> categories, List<MonthMix> months) {}

  /** Last months ending at {@code to}: top categories, everything else as "Other". */
  private Mix monthlyMix(UUID ws, LocalDate to) {
    YearMonth last = YearMonth.from(to);
    YearMonth first = last.minusMonths(MONTHS - 1L);
    Map<String, Map<String, Long>> byMonth = new LinkedHashMap<>();
    Map<String, Long> totals = new LinkedHashMap<>();
    for (YearMonth m = first; !m.isAfter(last); m = m.plusMonths(1)) {
      byMonth.put(m.toString(), new LinkedHashMap<>());
    }
    db.list(
        "SELECT to_char(date_trunc('month', t.occurred_on), 'YYYY-MM'), COALESCE(g.name, 'Uncategorized'), "
            + "SUM(t.base_amount_minor) FROM transactions t LEFT JOIN categories c ON c.id = t.category_id "
            + "LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) "
            + "WHERE t.workspace_id = ? AND t.type = 'EXPENSE' AND t.deleted_at IS NULL AND t.loan_id IS NULL "
            + "AND t.spent_by IS NULL AND t.base_amount_minor IS NOT NULL AND t.occurred_on BETWEEN ? AND ? GROUP BY 1, 2",
        rs -> {
          String name = rs.getString(2);
          long v = rs.getLong(3);
          byMonth
              .computeIfAbsent(rs.getString(1), k -> new LinkedHashMap<>())
              .merge(name, v, Long::sum);
          totals.merge(name, v, Long::sum);
          return null;
        },
        ws,
        first.atDay(1),
        last.atEndOfMonth());

    List<String> top =
        totals.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
            .limit(STACK_CATEGORIES)
            .map(Map.Entry::getKey)
            .toList();
    boolean hasOther = totals.size() > top.size();
    List<MonthMix> months = new ArrayList<>();
    byMonth.forEach(
        (month, cats) -> {
          Map<String, Long> row = new LinkedHashMap<>();
          long other = 0;
          for (var e : cats.entrySet()) {
            if (top.contains(e.getKey())) row.put(e.getKey(), e.getValue());
            else other += e.getValue();
          }
          if (hasOther) row.put("Other", other);
          months.add(new MonthMix(month, row));
        });
    List<String> names = new ArrayList<>(top);
    if (hasOther) names.add("Other");
    return new Mix(names, months);
  }
}

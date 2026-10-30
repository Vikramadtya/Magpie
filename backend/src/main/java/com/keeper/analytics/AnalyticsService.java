package com.keeper.analytics;

import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/** Read-only reports. Heavy lifting is SQL GROUP BY; only currency conversion happens in Java. */
@Singleton
public class AnalyticsService {

  @io.micronaut.serde.annotation.Serdeable
  public record CategorySpend(UUID categoryId, String name, String color, long totalMinor) {}

  @io.micronaut.serde.annotation.Serdeable
  public record MonthFlow(String month, long incomeMinor, long expenseMinor) {}

  @io.micronaut.serde.annotation.Serdeable
  public record NetWorthPoint(String month, long netWorthMinor) {}

  @io.micronaut.serde.annotation.Serdeable
  public record PayeeSpend(UUID payeeId, String name, long totalMinor, int count) {}

  @io.micronaut.serde.annotation.Serdeable
  public record Report<T>(String currency, List<T> items, List<String> missingCurrencies) {}

  private final Db db;
  private final FxConverter fx;

  public AnalyticsService(Db db, FxConverter fx) {
    this.db = db;
    this.fx = fx;
  }

  /** Expense totals rolled up to top-level categories. */
  public Report<CategorySpend> spendingByCategory(UUID ws, LocalDate from, LocalDate to) {
    var converter = fx.forWorkspace(ws);
    Map<UUID, CategorySpend> byGroup = new LinkedHashMap<>();
    db.list(
        "SELECT g.id, g.name, g.color, t.currency, SUM(t.amount_minor) FROM transactions t "
            + "JOIN categories c ON c.id = t.category_id JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) "
            + "WHERE t.workspace_id = ? AND t.type = 'EXPENSE' AND t.deleted_at IS NULL "
            + "AND t.occurred_on BETWEEN ? AND ? GROUP BY g.id, g.name, g.color, t.currency",
        rs -> {
          UUID id = rs.getObject(1, UUID.class);
          long v = converter.toBase(rs.getLong(5), rs.getString(4));
          byGroup.merge(
              id,
              new CategorySpend(id, rs.getString(2), rs.getString(3), v),
              (a, b) ->
                  new CategorySpend(
                      a.categoryId(), a.name(), a.color(), a.totalMinor() + b.totalMinor()));
          return null;
        },
        ws,
        from,
        to);
    List<CategorySpend> sorted = new ArrayList<>(byGroup.values());
    sorted.sort(Comparator.comparingLong(CategorySpend::totalMinor).reversed());
    return new Report<>(converter.base(), sorted, List.copyOf(converter.missing()));
  }

  public Report<MonthFlow> cashFlow(UUID ws, LocalDate from, LocalDate to) {
    var converter = fx.forWorkspace(ws);
    Map<String, long[]> months = new TreeMap<>();
    db.list(
        "SELECT to_char(date_trunc('month', occurred_on), 'YYYY-MM'), type, currency, SUM(amount_minor) FROM transactions "
            + "WHERE workspace_id = ? AND type IN ('INCOME','EXPENSE') AND deleted_at IS NULL "
            + "AND occurred_on BETWEEN ? AND ? GROUP BY 1, 2, 3",
        rs -> {
          long[] slot = months.computeIfAbsent(rs.getString(1), k -> new long[2]);
          long v = converter.toBase(rs.getLong(4), rs.getString(3));
          slot["INCOME".equals(rs.getString(2)) ? 0 : 1] += v;
          return null;
        },
        ws,
        from,
        to);
    // include empty months so the chart has no gaps
    for (YearMonth m = YearMonth.from(from); !m.isAfter(YearMonth.from(to)); m = m.plusMonths(1)) {
      months.computeIfAbsent(m.toString(), k -> new long[2]);
    }
    List<MonthFlow> items = new ArrayList<>();
    months.forEach((m, v) -> items.add(new MonthFlow(m, v[0], v[1])));
    return new Report<>(converter.base(), items, List.copyOf(converter.missing()));
  }

  /**
   * Month-end net worth over the last {@code months} months, including transfers and opening
   * balances.
   */
  public Report<NetWorthPoint> netWorth(UUID ws, int months) {
    var converter = fx.forWorkspace(ws);
    YearMonth last = YearMonth.now();
    YearMonth first = last.minusMonths(months - 1L);

    // net worth at start = openings + all activity before the first month
    Map<String, Long> startByCurrency = new LinkedHashMap<>();
    db.list(
        "SELECT a.currency, SUM(a.opening_balance_minor) + COALESCE(SUM((SELECT SUM(t.direction * t.amount_minor) "
            + "FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL AND t.occurred_on < ?)), 0) "
            + "FROM accounts a WHERE a.workspace_id = ? GROUP BY a.currency",
        rs -> {
          startByCurrency.put(rs.getString(1), rs.getLong(2));
          return null;
        },
        first.atDay(1),
        ws);

    Map<String, Map<String, Long>> deltas = new TreeMap<>();
    db.list(
        "SELECT to_char(date_trunc('month', occurred_on), 'YYYY-MM'), currency, SUM(direction * amount_minor) FROM transactions "
            + "WHERE workspace_id = ? AND deleted_at IS NULL AND occurred_on >= ? GROUP BY 1, 2",
        rs -> {
          deltas
              .computeIfAbsent(rs.getString(1), k -> new LinkedHashMap<>())
              .put(rs.getString(2), rs.getLong(3));
          return null;
        },
        ws,
        first.atDay(1));

    Map<String, Long> running = new LinkedHashMap<>(startByCurrency);
    List<NetWorthPoint> points = new ArrayList<>();
    for (YearMonth m = first; !m.isAfter(last); m = m.plusMonths(1)) {
      deltas
          .getOrDefault(m.toString(), Map.of())
          .forEach((cur, d) -> running.merge(cur, d, Long::sum));
      long total = 0;
      for (var e : running.entrySet()) total += converter.toBase(e.getValue(), e.getKey());
      points.add(new NetWorthPoint(m.toString(), total));
    }
    return new Report<>(converter.base(), points, List.copyOf(converter.missing()));
  }

  public Report<PayeeSpend> topPayees(UUID ws, LocalDate from, LocalDate to, int limit) {
    var converter = fx.forWorkspace(ws);
    Map<UUID, PayeeSpend> byPayee = new LinkedHashMap<>();
    db.list(
        "SELECT p.id, p.name, t.currency, SUM(t.amount_minor), COUNT(*) FROM transactions t JOIN payees p ON p.id = t.payee_id "
            + "WHERE t.workspace_id = ? AND t.type = 'EXPENSE' AND t.deleted_at IS NULL AND t.occurred_on BETWEEN ? AND ? "
            + "GROUP BY p.id, p.name, t.currency",
        rs -> {
          UUID id = rs.getObject(1, UUID.class);
          PayeeSpend add =
              new PayeeSpend(
                  id,
                  rs.getString(2),
                  converter.toBase(rs.getLong(4), rs.getString(3)),
                  rs.getInt(5));
          byPayee.merge(
              id,
              add,
              (a, b) ->
                  new PayeeSpend(
                      id, a.name(), a.totalMinor() + b.totalMinor(), a.count() + b.count()));
          return null;
        },
        ws,
        from,
        to);
    List<PayeeSpend> sorted = new ArrayList<>(byPayee.values());
    sorted.sort(Comparator.comparingLong(PayeeSpend::totalMinor).reversed());
    return new Report<>(
        converter.base(),
        sorted.stream().limit(Math.min(Math.max(limit, 1), 50)).toList(),
        List.copyOf(converter.missing()));
  }
}

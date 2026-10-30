package com.keeper.budget;

import com.keeper.common.RefChecks;
import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Singleton
public class BudgetService {

  @io.micronaut.serde.annotation.Serdeable
  public record Line(
      UUID categoryId,
      String categoryName,
      String color,
      long amountMinor,
      boolean rollover,
      long rolloverMinor,
      long spentMinor,
      long remainingMinor) {}

  @io.micronaut.serde.annotation.Serdeable
  public record Summary(
      String month, String currency, long budgetedMinor, long spentMinor, List<Line> lines) {}

  private record Budget(
      UUID categoryId, String name, String color, long amount, boolean rollover) {}

  private final Db db;
  private final RefChecks refs;
  private final FxConverter fx;

  public BudgetService(Db db, RefChecks refs, FxConverter fx) {
    this.db = db;
    this.refs = refs;
    this.fx = fx;
  }

  public Summary summary(UUID ws, YearMonth month) {
    var converter = fx.forWorkspace(ws);
    List<Budget> budgets = budgets(ws, month.atDay(1));
    Map<UUID, Long> spent = spentByCategory(ws, month, converter);
    Map<UUID, Long> previousSpent = spentByCategory(ws, month.minusMonths(1), converter);
    Map<UUID, Long> previousAmount = new HashMap<>();
    budgets(ws, month.minusMonths(1).atDay(1))
        .forEach(b -> previousAmount.put(b.categoryId, b.amount));

    long totalBudget = 0;
    long totalSpent = 0;
    List<Line> lines = new java.util.ArrayList<>();
    for (Budget b : budgets) {
      long carried =
          b.rollover && previousAmount.containsKey(b.categoryId)
              ? Math.max(
                  0,
                  previousAmount.get(b.categoryId) - previousSpent.getOrDefault(b.categoryId, 0L))
              : 0;
      long s = spent.getOrDefault(b.categoryId, 0L);
      lines.add(
          new Line(
              b.categoryId,
              b.name,
              b.color,
              b.amount,
              b.rollover,
              carried,
              s,
              b.amount + carried - s));
      totalBudget += b.amount + carried;
      totalSpent += s;
    }
    return new Summary(month.toString(), converter.base(), totalBudget, totalSpent, lines);
  }

  public void set(UUID ws, UUID categoryId, YearMonth month, long amount, boolean rollover) {
    refs.category(ws, categoryId);
    db.update(
        "INSERT INTO budgets(workspace_id, category_id, month, amount_minor, rollover) VALUES (?,?,?,?,?) "
            + "ON CONFLICT (workspace_id, category_id, month) DO UPDATE SET amount_minor = EXCLUDED.amount_minor, "
            + "rollover = EXCLUDED.rollover",
        ws,
        categoryId,
        month.atDay(1),
        amount,
        rollover);
  }

  public void remove(UUID ws, UUID categoryId, YearMonth month) {
    db.update(
        "DELETE FROM budgets WHERE workspace_id = ? AND category_id = ? AND month = ?",
        ws,
        categoryId,
        month.atDay(1));
  }

  /** Copies last month's budgets forward without overwriting any already set. */
  public int copyPrevious(UUID ws, YearMonth month) {
    return db.update(
        "INSERT INTO budgets(workspace_id, category_id, month, amount_minor, rollover) "
            + "SELECT workspace_id, category_id, ?, amount_minor, rollover FROM budgets WHERE workspace_id = ? AND month = ? "
            + "ON CONFLICT DO NOTHING",
        month.atDay(1),
        ws,
        month.minusMonths(1).atDay(1));
  }

  private List<Budget> budgets(UUID ws, LocalDate month) {
    return db.list(
        "SELECT b.category_id, c.name, c.color, b.amount_minor, b.rollover FROM budgets b "
            + "JOIN categories c ON c.id = b.category_id WHERE b.workspace_id = ? AND b.month = ? ORDER BY c.name",
        rs ->
            new Budget(
                rs.getObject(1, UUID.class),
                rs.getString(2),
                rs.getString(3),
                rs.getLong(4),
                rs.getBoolean(5)),
        ws,
        month);
  }

  /** Spend per category; a parent category also counts its children's spend. */
  private Map<UUID, Long> spentByCategory(
      UUID ws, YearMonth month, FxConverter.Converter converter) {
    Map<UUID, Long> totals = new HashMap<>();
    db.list(
        "SELECT t.category_id, c.parent_id, SUM(t.base_amount_minor) FROM transactions t "
            + "JOIN categories c ON c.id = t.category_id WHERE t.workspace_id = ? AND t.type = 'EXPENSE' "
            + "AND t.deleted_at IS NULL AND t.loan_id IS NULL AND t.base_amount_minor IS NOT NULL "
            + "AND t.occurred_on BETWEEN ? AND ? GROUP BY 1, 2",
        rs -> {
          long inBase = rs.getLong(3);
          totals.merge(rs.getObject(1, UUID.class), inBase, Long::sum);
          UUID parent = rs.getObject(2, UUID.class);
          if (parent != null) totals.merge(parent, inBase, Long::sum);
          return null;
        },
        ws,
        month.atDay(1),
        month.atEndOfMonth());
    return totals;
  }
}

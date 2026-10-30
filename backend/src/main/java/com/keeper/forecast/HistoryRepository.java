package com.keeper.forecast;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Spending history in the base currency (that day's rate), excluding loans and transfers. */
@Singleton
public class HistoryRepository {

  public record MonthGroup(String month, UUID groupId, String name, String color, long sumMinor) {}

  public record Row(
      UUID id,
      LocalDate date,
      long amountMinor,
      UUID groupId,
      String groupName,
      UUID payeeId,
      String payeeName,
      String note,
      UUID recurringRuleId) {}

  private final Db db;

  public HistoryRepository(Db db) {
    this.db = db;
  }

  /**
   * Variable (not rule-generated) expenses per month and top-level category, for completed months.
   */
  public List<MonthGroup> monthlyVariableExpense(UUID ws, LocalDate from, LocalDate before) {
    return db.list(
        "SELECT to_char(date_trunc('month', t.occurred_on), 'YYYY-MM'), g.id, COALESCE(g.name, 'Uncategorized'), g.color, "
            + "SUM(t.base_amount_minor) FROM transactions t "
            + "LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) "
            + "WHERE t.workspace_id = ? AND t.type = 'EXPENSE' AND t.deleted_at IS NULL AND t.loan_id IS NULL "
            + "AND t.recurring_rule_id IS NULL AND t.base_amount_minor IS NOT NULL AND t.occurred_on >= ? AND t.occurred_on < ? "
            + "GROUP BY 1, 2, 3, 4",
        rs ->
            new MonthGroup(
                rs.getString(1),
                rs.getObject(2, UUID.class),
                rs.getString(3),
                rs.getString(4),
                rs.getLong(5)),
        ws,
        from,
        before);
  }

  /** Non-recurring income per month. */
  public List<MonthGroup> monthlyVariableIncome(UUID ws, LocalDate from, LocalDate before) {
    return db.list(
        "SELECT to_char(date_trunc('month', occurred_on), 'YYYY-MM'), NULL::uuid, 'Income', NULL, SUM(base_amount_minor) "
            + "FROM transactions WHERE workspace_id = ? AND type = 'INCOME' AND deleted_at IS NULL AND loan_id IS NULL "
            + "AND recurring_rule_id IS NULL AND base_amount_minor IS NOT NULL AND occurred_on >= ? AND occurred_on < ? GROUP BY 1",
        rs -> new MonthGroup(rs.getString(1), null, rs.getString(3), null, rs.getLong(5)),
        ws,
        from,
        before);
  }

  /** Individual expenses (any source) since {@code from}, newest first, capped for safety. */
  public List<Row> expenses(UUID ws, LocalDate from) {
    return db.list(
        "SELECT t.id, t.occurred_on, t.base_amount_minor, g.id, COALESCE(g.name, 'Uncategorized'), p.id, p.name, t.note, t.recurring_rule_id "
            + "FROM transactions t LEFT JOIN categories c ON c.id = t.category_id "
            + "LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) LEFT JOIN payees p ON p.id = t.payee_id "
            + "WHERE t.workspace_id = ? AND t.type = 'EXPENSE' AND t.deleted_at IS NULL AND t.loan_id IS NULL "
            + "AND t.base_amount_minor IS NOT NULL AND t.occurred_on >= ? ORDER BY t.occurred_on DESC LIMIT 20000",
        rs ->
            new Row(
                rs.getObject(1, UUID.class),
                rs.getObject(2, LocalDate.class),
                rs.getLong(3),
                rs.getObject(4, UUID.class),
                rs.getString(5),
                rs.getObject(6, UUID.class),
                rs.getString(7),
                rs.getString(8),
                rs.getObject(9, UUID.class)),
        ws,
        from);
  }
}

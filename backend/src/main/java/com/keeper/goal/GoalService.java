package com.keeper.goal;

import com.keeper.common.db.Db;
import com.keeper.common.exception.ResourceNotFoundException;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Singleton
public class GoalService {

  @io.micronaut.serde.annotation.Serdeable
  public record Goal(
      UUID id,
      String name,
      long targetMinor,
      String currency,
      LocalDate targetDate,
      long savedMinor,
      int percent,
      LocalDate projectedDate,
      UUID accountId,
      String accountName) {}

  /**
   * Saved is the sum of deposits, or, when the goal follows an account, that account's balance. The
   * recent figure drives the pace: deposits in the last 90 days, or the account's net inflow.
   */
  private static final String SELECT =
      "SELECT g.id, g.name, g.target_minor, g.currency, g.target_date, g.account_id, a.name AS account_name, "
          + "CASE WHEN g.account_id IS NOT NULL THEN GREATEST(COALESCE(a.balance_minor, 0), 0) "
          + "ELSE COALESCE((SELECT SUM(amount_minor) FROM goal_contributions c WHERE c.goal_id = g.id), 0) END AS saved, "
          + "CASE WHEN g.account_id IS NOT NULL THEN COALESCE((SELECT SUM(t.direction * t.amount_minor) FROM transactions t "
          + "WHERE t.account_id = g.account_id AND t.deleted_at IS NULL AND t.occurred_on > CURRENT_DATE - 90), 0) "
          + "ELSE COALESCE((SELECT SUM(amount_minor) FROM goal_contributions c WHERE c.goal_id = g.id "
          + "AND c.occurred_on > CURRENT_DATE - 90), 0) END AS recent "
          + "FROM goals g LEFT JOIN accounts a ON a.id = g.account_id "
          + "WHERE g.workspace_id = ? AND g.archived_at IS NULL ";

  private final Db db;

  public GoalService(Db db) {
    this.db = db;
  }

  public List<Goal> list(UUID ws) {
    return db.list(SELECT + "ORDER BY g.created_at", GoalService::map, ws);
  }

  public Goal get(UUID ws, UUID id) {
    return db.one(SELECT + "AND g.id = ?", GoalService::map, ws, id)
        .orElseThrow(() -> new ResourceNotFoundException("Goal", id.toString()));
  }

  public Goal create(UUID ws, GoalController.Request r) {
    UUID id = UUID.randomUUID();
    String currency = r.currency().toUpperCase();
    checkAccount(ws, r.accountId(), currency);
    db.update(
        "INSERT INTO goals(id, workspace_id, name, target_minor, currency, target_date, account_id) VALUES (?,?,?,?,?,?,?)",
        id,
        ws,
        r.name().trim(),
        r.targetMinor(),
        currency,
        r.targetDate(),
        r.accountId());
    return get(ws, id);
  }

  public Goal update(UUID ws, UUID id, GoalController.Request r) {
    Goal current = get(ws, id);
    checkAccount(ws, r.accountId(), current.currency());
    db.update(
        "UPDATE goals SET name = ?, target_minor = ?, target_date = ?, account_id = ? WHERE workspace_id = ? AND id = ?",
        r.name().trim(),
        r.targetMinor(),
        r.targetDate(),
        r.accountId(),
        ws,
        id);
    return get(ws, id);
  }

  public void archive(UUID ws, UUID id) {
    db.update("UPDATE goals SET archived_at = NOW() WHERE workspace_id = ? AND id = ?", ws, id);
  }

  /** A followed account must be one of yours, not lent to you, and in the goal's currency. */
  private void checkAccount(UUID ws, UUID accountId, String currency) {
    if (accountId == null) return;
    String accountCurrency =
        db.one(
                "SELECT currency FROM accounts WHERE id = ? AND workspace_id = ? AND NOT memo",
                rs -> rs.getString(1),
                accountId,
                ws)
            .orElseThrow(
                () -> new com.keeper.common.exception.BadRequestException("Unknown account"));
    if (!accountCurrency.equals(currency))
      throw new com.keeper.common.exception.BusinessRuleException(
          "This goal is in " + currency + "; pick a " + currency + " account to follow.");
  }

  public Goal contribute(UUID ws, UUID id, long amountMinor, LocalDate date) {
    Goal goal = get(ws, id);
    if (goal.accountId() != null)
      throw new com.keeper.common.exception.BusinessRuleException(
          "This goal follows "
              + goal.accountName()
              + ", so its progress is that account's balance.");
    db.update(
        "INSERT INTO goal_contributions(goal_id, amount_minor, occurred_on) VALUES (?,?,?)",
        id,
        amountMinor,
        date);
    return get(ws, id);
  }

  private static Goal map(java.sql.ResultSet rs) throws java.sql.SQLException {
    long target = rs.getLong("target_minor");
    long saved = rs.getLong("saved");
    long recent = rs.getLong("recent");
    int percent = (int) Math.max(0, Math.min(100, saved * 100 / target));
    return new Goal(
        rs.getObject("id", UUID.class),
        rs.getString("name"),
        target,
        rs.getString("currency"),
        rs.getObject("target_date", LocalDate.class),
        saved,
        percent,
        projection(target, saved, recent),
        rs.getObject("account_id", UUID.class),
        rs.getString("account_name"));
  }

  /** Extrapolates the last 90 days' saving rate; null when there is no pace to extrapolate. */
  static LocalDate projection(long target, long saved, long recent90Days) {
    if (saved >= target) return LocalDate.now();
    if (recent90Days <= 0) return null;
    double perDay = recent90Days / 90.0;
    long daysLeft = (long) Math.ceil((target - saved) / perDay);
    return LocalDate.now().plus(daysLeft, ChronoUnit.DAYS);
  }
}

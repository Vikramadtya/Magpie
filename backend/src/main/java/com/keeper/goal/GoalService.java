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
      LocalDate projectedDate) {}

  private static final String SELECT =
      "SELECT g.id, g.name, g.target_minor, g.currency, g.target_date, "
          + "COALESCE((SELECT SUM(amount_minor) FROM goal_contributions c WHERE c.goal_id = g.id), 0) AS saved, "
          + "COALESCE((SELECT SUM(amount_minor) FROM goal_contributions c WHERE c.goal_id = g.id "
          + "AND c.occurred_on > CURRENT_DATE - 90), 0) AS recent FROM goals g "
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
    db.update(
        "INSERT INTO goals(id, workspace_id, name, target_minor, currency, target_date) VALUES (?,?,?,?,?,?)",
        id,
        ws,
        r.name().trim(),
        r.targetMinor(),
        r.currency().toUpperCase(),
        r.targetDate());
    return get(ws, id);
  }

  public Goal update(UUID ws, UUID id, GoalController.Request r) {
    get(ws, id);
    db.update(
        "UPDATE goals SET name = ?, target_minor = ?, target_date = ? WHERE workspace_id = ? AND id = ?",
        r.name().trim(),
        r.targetMinor(),
        r.targetDate(),
        ws,
        id);
    return get(ws, id);
  }

  public void archive(UUID ws, UUID id) {
    db.update("UPDATE goals SET archived_at = NOW() WHERE workspace_id = ? AND id = ?", ws, id);
  }

  public Goal contribute(UUID ws, UUID id, long amountMinor, LocalDate date) {
    get(ws, id);
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
        projection(target, saved, recent));
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

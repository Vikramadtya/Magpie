package com.keeper.trip;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class TripRepository {

  public record Row(
      UUID id,
      String name,
      LocalDate startDate,
      LocalDate endDate,
      Long budgetMinor,
      String notes,
      long spentMinor,
      int expenseCount) {}

  /** Only real spending counts: expenses, not loans or transfers. */
  private static final String SELECT =
      "SELECT t.id, t.name, t.start_date, t.end_date, t.budget_minor, t.notes, "
          + "COALESCE(SUM(x.base_amount_minor), 0) AS spent, COUNT(x.id) AS n FROM trips t "
          + "LEFT JOIN transactions x ON x.trip_id = t.id AND x.deleted_at IS NULL AND x.type = 'EXPENSE' AND x.loan_id IS NULL "
          + "WHERE t.workspace_id = ? ";

  private static final RowMapper<Row> MAPPER =
      rs ->
          new Row(
              rs.getObject("id", UUID.class),
              rs.getString("name"),
              rs.getObject("start_date", LocalDate.class),
              rs.getObject("end_date", LocalDate.class),
              rs.getObject("budget_minor", Long.class),
              rs.getString("notes"),
              rs.getLong("spent"),
              rs.getInt("n"));

  private final Db db;

  public TripRepository(Db db) {
    this.db = db;
  }

  public List<Row> findAll(UUID ws) {
    return db.list(
        SELECT + "GROUP BY t.id ORDER BY t.start_date DESC, t.created_at DESC", MAPPER, ws);
  }

  public Optional<Row> find(UUID ws, UUID id) {
    return db.one(SELECT + "AND t.id = ? GROUP BY t.id", MAPPER, ws, id);
  }

  public UUID insert(
      UUID ws, String name, LocalDate start, LocalDate end, Long budget, String notes) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO trips(id, workspace_id, name, start_date, end_date, budget_minor, notes) VALUES (?,?,?,?,?,?,?)",
        id,
        ws,
        name,
        start,
        end,
        budget,
        notes);
    return id;
  }

  public int update(
      UUID ws, UUID id, String name, LocalDate start, LocalDate end, Long budget, String notes) {
    return db.update(
        "UPDATE trips SET name = ?, start_date = ?, end_date = ?, budget_minor = ?, notes = ? WHERE workspace_id = ? AND id = ?",
        name,
        start,
        end,
        budget,
        notes,
        ws,
        id);
  }

  public int delete(UUID ws, UUID id) {
    return db.update("DELETE FROM trips WHERE workspace_id = ? AND id = ?", ws, id);
  }

  // ---------- trips that come from a split-app group ----------

  public Optional<UUID> findIdByExternalRef(UUID ws, String ref) {
    return db.one(
        "SELECT id FROM trips WHERE workspace_id = ? AND external_ref = ?",
        rs -> rs.getObject(1, UUID.class),
        ws,
        ref);
  }

  public Optional<UUID> findIdByName(UUID ws, String name) {
    return db.one(
        "SELECT id FROM trips WHERE workspace_id = ? AND lower(name) = lower(?) ORDER BY start_date DESC LIMIT 1",
        rs -> rs.getObject(1, UUID.class),
        ws,
        name.trim());
  }

  public UUID insertFromGroup(UUID ws, String name, LocalDate date, String ref) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO trips(id, workspace_id, name, start_date, end_date, external_ref) VALUES (?,?,?,?,?,?)",
        id,
        ws,
        name.trim(),
        date,
        date,
        ref);
    return id;
  }

  /** Stretches a group trip's dates to cover a new expense. */
  public void extendToCover(UUID id, LocalDate date) {
    db.update(
        "UPDATE trips SET start_date = LEAST(start_date, ?), end_date = GREATEST(end_date, ?) WHERE id = ?",
        date,
        date,
        id);
  }

  public Optional<String> externalRef(UUID ws, UUID id) {
    return db.one(
        "SELECT external_ref FROM trips WHERE workspace_id = ? AND id = ? AND external_ref IS NOT NULL",
        rs -> rs.getString(1),
        ws,
        id);
  }

  // ---------- assignment ----------

  public int assign(UUID ws, UUID tripId, List<UUID> ids) {
    return db.update(
        "UPDATE transactions SET trip_id = ? WHERE workspace_id = ? AND id = ANY(?) AND type = 'EXPENSE' "
            + "AND loan_id IS NULL AND deleted_at IS NULL",
        tripId,
        ws,
        ids);
  }

  /**
   * Every untagged everyday expense in the date range; recurring bills (rent, subscriptions) are
   * left out.
   */
  public int assignRange(UUID ws, UUID tripId, LocalDate from, LocalDate to) {
    return db.update(
        "UPDATE transactions SET trip_id = ? WHERE workspace_id = ? AND type = 'EXPENSE' AND loan_id IS NULL "
            + "AND trip_id IS NULL AND recurring_rule_id IS NULL AND deleted_at IS NULL AND occurred_on BETWEEN ? AND ?",
        tripId,
        ws,
        from,
        to);
  }

  public long unassignedInRange(UUID ws, LocalDate from, LocalDate to) {
    return db.count(
        "SELECT count(*) FROM transactions WHERE workspace_id = ? AND type = 'EXPENSE' AND loan_id IS NULL "
            + "AND trip_id IS NULL AND recurring_rule_id IS NULL AND deleted_at IS NULL AND occurred_on BETWEEN ? AND ?",
        ws,
        from,
        to);
  }

  public int unassign(UUID ws, List<UUID> ids) {
    return db.update(
        "UPDATE transactions SET trip_id = NULL WHERE workspace_id = ? AND id = ANY(?)", ws, ids);
  }

  public int clear(UUID ws, UUID tripId) {
    return db.update(
        "UPDATE transactions SET trip_id = NULL WHERE workspace_id = ? AND trip_id = ?",
        ws,
        tripId);
  }
}

package com.keeper.recurring;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class RecurringRepository {
  private static final String COLS =
      "id, name, account_id, category_id, payee_id, type, amount_minor, currency, frequency, interval_n, anchor_day, "
          + "next_run_on, end_on, auto_post, status";
  private static final RowMapper<RecurringRule> MAPPER =
      rs ->
          new RecurringRule(
              rs.getObject("id", UUID.class),
              rs.getString("name"),
              rs.getObject("account_id", UUID.class),
              rs.getObject("category_id", UUID.class),
              rs.getObject("payee_id", UUID.class),
              rs.getString("type"),
              rs.getLong("amount_minor"),
              rs.getString("currency"),
              Frequency.valueOf(rs.getString("frequency")),
              rs.getInt("interval_n"),
              rs.getInt("anchor_day"),
              rs.getObject("next_run_on", LocalDate.class),
              rs.getObject("end_on", LocalDate.class),
              rs.getBoolean("auto_post"),
              rs.getString("status"));

  private final Db db;

  public RecurringRepository(Db db) {
    this.db = db;
  }

  public List<RecurringRule> findAll(UUID ws) {
    return db.list(
        "SELECT " + COLS + " FROM recurring_rules WHERE workspace_id = ? ORDER BY next_run_on",
        MAPPER,
        ws);
  }

  public Optional<RecurringRule> find(UUID ws, UUID id) {
    return db.one(
        "SELECT " + COLS + " FROM recurring_rules WHERE workspace_id = ? AND id = ?",
        MAPPER,
        ws,
        id);
  }

  /** Due rules for every workspace; SKIP LOCKED lets several instances share the work safely. */
  public List<RecurringRule> lockDue(LocalDate today) {
    return db.list(
        "SELECT "
            + COLS
            + " FROM recurring_rules WHERE status = 'ACTIVE' AND auto_post AND next_run_on <= ? "
            + "ORDER BY next_run_on FOR UPDATE SKIP LOCKED LIMIT 200",
        MAPPER,
        today);
  }

  public UUID workspaceOf(UUID ruleId) {
    return db.one(
            "SELECT workspace_id FROM recurring_rules WHERE id = ?",
            rs -> rs.getObject(1, UUID.class),
            ruleId)
        .orElseThrow();
  }

  public UUID createdBy(UUID ruleId) {
    return db.one(
            "SELECT created_by FROM recurring_rules WHERE id = ?",
            rs -> rs.getObject(1, UUID.class),
            ruleId)
        .orElseThrow();
  }

  public UUID insert(UUID ws, UUID actor, RecurringController.Request r) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO recurring_rules(id, workspace_id, name, account_id, category_id, payee_id, type, amount_minor, currency, "
            + "frequency, interval_n, anchor_day, next_run_on, end_on, auto_post, created_by) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        ws,
        r.name().trim(),
        r.accountId(),
        r.categoryId(),
        r.payeeId(),
        r.type(),
        r.amountMinor(),
        r.currency(),
        r.frequency(),
        r.intervalN(),
        r.startOn().getDayOfMonth(),
        r.startOn(),
        r.endOn(),
        r.autoPost(),
        actor);
    return id;
  }

  public void update(UUID ws, UUID id, RecurringController.Request r) {
    db.update(
        "UPDATE recurring_rules SET name = ?, account_id = ?, category_id = ?, payee_id = ?, type = ?, amount_minor = ?, "
            + "currency = ?, frequency = ?, interval_n = ?, anchor_day = ?, next_run_on = ?, end_on = ?, auto_post = ? "
            + "WHERE workspace_id = ? AND id = ?",
        r.name().trim(),
        r.accountId(),
        r.categoryId(),
        r.payeeId(),
        r.type(),
        r.amountMinor(),
        r.currency(),
        r.frequency(),
        r.intervalN(),
        r.startOn().getDayOfMonth(),
        r.startOn(),
        r.endOn(),
        r.autoPost(),
        ws,
        id);
  }

  public void advance(UUID id, LocalDate nextRun, boolean finished) {
    db.update(
        "UPDATE recurring_rules SET next_run_on = ?, status = CASE WHEN ? THEN 'PAUSED' ELSE status END WHERE id = ?",
        nextRun,
        finished,
        id);
  }

  public void setStatus(UUID ws, UUID id, String status) {
    db.update(
        "UPDATE recurring_rules SET status = ? WHERE workspace_id = ? AND id = ?", status, ws, id);
  }

  public void delete(UUID ws, UUID id) {
    db.update("DELETE FROM recurring_rules WHERE workspace_id = ? AND id = ?", ws, id);
  }
}

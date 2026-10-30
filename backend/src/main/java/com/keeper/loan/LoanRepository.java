package com.keeper.loan;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class LoanRepository {

  public record Row(
      UUID id,
      String person,
      String direction,
      long principalMinor,
      String currency,
      LocalDate occurredOn,
      LocalDate dueOn,
      String note,
      long repaidMinor) {}

  /** Repayments move money the opposite way to the original loan. */
  private static final String SELECT =
      "SELECT l.id, l.person, l.direction, l.principal_minor, l.currency, l.occurred_on, l.due_on, l.note, "
          + "COALESCE((SELECT SUM(t.amount_minor) FROM transactions t WHERE t.loan_id = l.id AND t.deleted_at IS NULL "
          + "AND t.direction = CASE WHEN l.direction = 'BORROWED' THEN -1 ELSE 1 END), 0) AS repaid "
          + "FROM loans l WHERE l.workspace_id = ? AND l.deleted_at IS NULL ";

  private static final RowMapper<Row> MAPPER =
      rs ->
          new Row(
              rs.getObject("id", UUID.class),
              rs.getString("person"),
              rs.getString("direction"),
              rs.getLong("principal_minor"),
              rs.getString("currency"),
              rs.getObject("occurred_on", LocalDate.class),
              rs.getObject("due_on", LocalDate.class),
              rs.getString("note"),
              rs.getLong("repaid"));

  private final Db db;

  public LoanRepository(Db db) {
    this.db = db;
  }

  public List<Row> findAll(UUID ws) {
    return db.list(SELECT + "ORDER BY l.occurred_on DESC, l.created_at DESC", MAPPER, ws);
  }

  public Optional<Row> find(UUID ws, UUID id) {
    return db.one(SELECT + "AND l.id = ?", MAPPER, ws, id);
  }

  public UUID insert(
      UUID ws,
      UUID actor,
      String person,
      String direction,
      long principal,
      String currency,
      LocalDate date,
      LocalDate due,
      String note) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO loans(id, workspace_id, person, direction, principal_minor, currency, occurred_on, due_on, note, created_by) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?)",
        id,
        ws,
        person,
        direction,
        principal,
        currency,
        date,
        due,
        note,
        actor);
    return id;
  }

  public void markDeleted(UUID ws, UUID id) {
    db.update("UPDATE loans SET deleted_at = NOW() WHERE workspace_id = ? AND id = ?", ws, id);
  }
}

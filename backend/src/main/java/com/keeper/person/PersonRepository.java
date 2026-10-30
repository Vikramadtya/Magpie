package com.keeper.person;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class PersonRepository {
  private static final RowMapper<Person> MAPPER =
      rs -> new Person(rs.getObject("id", UUID.class), rs.getString("name"));

  private final Db db;

  public PersonRepository(Db db) {
    this.db = db;
  }

  public List<Person> list(UUID ws) {
    return db.list("SELECT id, name FROM people WHERE workspace_id = ? ORDER BY name", MAPPER, ws);
  }

  /** Idempotent: returns the existing person when the name (case-insensitive) is taken. */
  public Person upsert(UUID ws, String name) {
    return db.returning(
            "INSERT INTO people(workspace_id, name) VALUES (?,?) "
                + "ON CONFLICT (workspace_id, lower(name)) DO UPDATE SET name = people.name "
                + "RETURNING id, name",
            MAPPER,
            ws,
            name)
        .orElseThrow();
  }

  public Optional<Person> rename(UUID ws, UUID id, String name) {
    return db.returning(
        "UPDATE people SET name = ? WHERE workspace_id = ? AND id = ? RETURNING id, name",
        MAPPER,
        name,
        ws,
        id);
  }

  public long usage(UUID ws, UUID id) {
    return db.count(
        "SELECT count(*) FROM transactions WHERE workspace_id = ? AND spent_by = ? AND deleted_at IS NULL",
        ws,
        id);
  }

  public void delete(UUID ws, UUID id) {
    db.update(
        "UPDATE transactions SET spent_by = NULL WHERE workspace_id = ? AND spent_by = ?", ws, id);
    db.update("DELETE FROM people WHERE workspace_id = ? AND id = ?", ws, id);
  }
}

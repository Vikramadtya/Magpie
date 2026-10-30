package com.keeper.payee;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class PayeeRepository {
  private static final RowMapper<Payee> MAPPER =
      rs ->
          new Payee(
              rs.getObject("id", UUID.class),
              rs.getString("name"),
              rs.getObject("default_category_id", UUID.class));

  private final Db db;

  public PayeeRepository(Db db) {
    this.db = db;
  }

  public List<Payee> search(UUID ws, String q) {
    String like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    return db.list(
        "SELECT id, name, default_category_id FROM payees WHERE workspace_id = ? AND name ILIKE ? ORDER BY name LIMIT 500",
        MAPPER,
        ws,
        like);
  }

  /** Idempotent: returns the existing payee when the name (case-insensitive) is already taken. */
  public Payee upsert(UUID ws, String name, UUID defaultCategoryId) {
    return db.returning(
            "INSERT INTO payees(workspace_id, name, default_category_id) VALUES (?,?,?) "
                + "ON CONFLICT (workspace_id, lower(name)) DO UPDATE SET name = payees.name "
                + "RETURNING id, name, default_category_id",
            MAPPER,
            ws,
            name,
            defaultCategoryId)
        .orElseThrow();
  }

  public Optional<Payee> update(UUID ws, UUID id, String name, UUID defaultCategoryId) {
    return db.returning(
        "UPDATE payees SET name = ?, default_category_id = ? WHERE workspace_id = ? AND id = ? "
            + "RETURNING id, name, default_category_id",
        MAPPER,
        name,
        defaultCategoryId,
        ws,
        id);
  }

  public void delete(UUID ws, UUID id) {
    db.update("DELETE FROM payees WHERE workspace_id = ? AND id = ?", ws, id);
  }

  public Optional<UUID> defaultCategory(UUID ws, UUID payeeId) {
    return db.one(
        "SELECT default_category_id FROM payees WHERE workspace_id = ? AND id = ? AND default_category_id IS NOT NULL",
        rs -> rs.getObject(1, UUID.class),
        ws,
        payeeId);
  }
}

package com.keeper.workspace;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import com.keeper.security.Role;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class WorkspaceRepository {

  private static final RowMapper<Workspace> WS =
      rs ->
          new Workspace(
              rs.getObject("id", UUID.class),
              rs.getString("name"),
              rs.getString("base_currency"),
              Role.valueOf(rs.getString("role")));

  private static final String SELECT =
      "SELECT w.id, w.name, w.base_currency, m.role FROM workspaces w "
          + "JOIN workspace_members m ON m.workspace_id = w.id ";

  private final Db db;

  public WorkspaceRepository(Db db) {
    this.db = db;
  }

  public List<Workspace> findForUser(UUID userId) {
    return db.list(SELECT + "WHERE m.user_id = ? ORDER BY w.created_at", WS, userId);
  }

  public Optional<Workspace> find(UUID workspaceId, UUID userId) {
    return db.one(SELECT + "WHERE w.id = ? AND m.user_id = ?", WS, workspaceId, userId);
  }

  public UUID insert(String name, String currency, UUID owner) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO workspaces(id, created_by, name, base_currency) VALUES (?, ?, ?, ?)",
        id,
        owner,
        name,
        currency);
    db.update(
        "INSERT INTO workspace_members(workspace_id, user_id, role) VALUES (?, ?, 'OWNER')",
        id,
        owner);
    return id;
  }

  public void rename(UUID id, String name, String currency) {
    db.update("UPDATE workspaces SET name = ?, base_currency = ? WHERE id = ?", name, currency, id);
  }

  /**
   * Transactions are removed first: they reference accounts with RESTRICT, so a plain cascade can
   * fail.
   */
  public void delete(UUID id) {
    db.tx(
        () -> {
          db.update("DELETE FROM transactions WHERE workspace_id = ?", id);
          db.update("DELETE FROM workspaces WHERE id = ?", id);
        });
  }
}

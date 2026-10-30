package com.keeper.workspace;

import com.keeper.common.db.Db;
import com.keeper.common.db.RowMapper;
import com.keeper.security.Role;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class WorkspaceRepository {

  @Serdeable
  public record Member(UUID userId, String name, String email, Role role, Instant joinedAt) {}

  private static final RowMapper<Workspace> WS =
      rs ->
          new Workspace(
              rs.getObject("id", UUID.class),
              rs.getString("name"),
              rs.getString("base_currency"),
              Role.valueOf(rs.getString("role")),
              rs.getString("kind"));

  private final Db db;

  public WorkspaceRepository(Db db) {
    this.db = db;
  }

  public List<Workspace> findForUser(UUID userId) {
    return db.list(
        "SELECT w.id, w.name, w.base_currency, m.role, w.kind FROM workspaces w "
            + "JOIN workspace_members m ON m.workspace_id = w.id WHERE m.user_id = ? ORDER BY w.created_at",
        WS,
        userId);
  }

  public Optional<Workspace> find(UUID workspaceId, UUID userId) {
    return db.one(
        "SELECT w.id, w.name, w.base_currency, m.role, w.kind FROM workspaces w "
            + "JOIN workspace_members m ON m.workspace_id = w.id WHERE w.id = ? AND m.user_id = ?",
        WS,
        workspaceId,
        userId);
  }

  public UUID insert(String name, String currency, UUID owner, String kind) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO workspaces(id, created_by, name, base_currency, kind) VALUES (?, ?, ?, ?, ?)",
        id,
        owner,
        name,
        currency,
        kind);
    addMember(id, owner, Role.OWNER);
    return id;
  }

  public void rename(UUID id, String name, String currency) {
    db.update("UPDATE workspaces SET name = ?, base_currency = ? WHERE id = ?", name, currency, id);
  }

  public void delete(UUID id) {
    db.update("DELETE FROM workspaces WHERE id = ?", id);
  }

  public void addMember(UUID workspaceId, UUID userId, Role role) {
    db.update(
        "INSERT INTO workspace_members(workspace_id, user_id, role) VALUES (?, ?, ?) "
            + "ON CONFLICT (workspace_id, user_id) DO NOTHING",
        workspaceId,
        userId,
        role);
  }

  public List<Member> members(UUID workspaceId) {
    return db.list(
        "SELECT u.id, u.name, u.email, m.role, m.joined_at FROM workspace_members m "
            + "JOIN users u ON u.id = m.user_id WHERE m.workspace_id = ? ORDER BY m.joined_at",
        rs ->
            new Member(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("email"),
                Role.valueOf(rs.getString("role")),
                rs.getObject("joined_at", OffsetDateTime.class).toInstant()),
        workspaceId);
  }

  public long ownerCount(UUID workspaceId) {
    return db.count(
        "SELECT count(*) FROM workspace_members WHERE workspace_id = ? AND role = 'OWNER'",
        workspaceId);
  }

  public Optional<Role> roleOf(UUID workspaceId, UUID userId) {
    return db.one(
        "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
        rs -> Role.valueOf(rs.getString(1)),
        workspaceId,
        userId);
  }

  public int setRole(UUID workspaceId, UUID userId, Role role) {
    return db.update(
        "UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?",
        role,
        workspaceId,
        userId);
  }

  public int removeMember(UUID workspaceId, UUID userId) {
    return db.update(
        "DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
        workspaceId,
        userId);
  }

  // ---- invites ----

  public void insertInvite(
      UUID workspaceId, Role role, String tokenHash, Instant expires, UUID by) {
    db.update(
        "INSERT INTO workspace_invites(workspace_id, role, token_hash, expires_at, created_by) VALUES (?,?,?,?,?)",
        workspaceId,
        role,
        tokenHash,
        expires,
        by);
  }

  public record Invite(UUID id, UUID workspaceId, Role role) {}

  /** Claims a valid invite exactly once. */
  public Optional<Invite> claimInvite(String tokenHash) {
    return db.returning(
        "UPDATE workspace_invites SET accepted_at = NOW() WHERE token_hash = ? AND accepted_at IS NULL "
            + "AND expires_at > NOW() RETURNING id, workspace_id, role",
        rs ->
            new Invite(
                rs.getObject("id", UUID.class),
                rs.getObject("workspace_id", UUID.class),
                Role.valueOf(rs.getString("role"))),
        tokenHash);
  }
}

package com.keeper.lending;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class ShareRepository {

  /** What accepting needs to know about the lent account. */
  public record Offer(
      UUID id, UUID ownerWorkspaceId, String ownerName, String accountName, String currency) {}

  private static final String OWNER_NAME =
      "(SELECT u.name FROM workspace_members m JOIN users u ON u.id = m.user_id "
          + "WHERE m.workspace_id = s.owner_workspace_id AND m.role = 'OWNER' LIMIT 1)";

  private final Db db;

  public ShareRepository(Db db) {
    this.db = db;
  }

  public List<Share> forAccount(UUID ws, UUID accountId) {
    return db.list(
        "SELECT s.id, s.account_id, s.guest_email, u.name, s.status FROM account_shares s "
            + "LEFT JOIN users u ON u.id = s.guest_user_id "
            + "WHERE s.owner_workspace_id = ? AND s.account_id = ? AND s.status IN ('PENDING','ACTIVE') "
            + "ORDER BY s.created_at",
        rs ->
            new Share(
                rs.getObject(1, UUID.class),
                rs.getObject(2, UUID.class),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5)),
        ws,
        accountId);
  }

  public UUID insert(UUID ws, UUID accountId, String email) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO account_shares(id, owner_workspace_id, account_id, guest_email) VALUES (?,?,?,?)",
        id,
        ws,
        accountId,
        email);
    return id;
  }

  public List<Invitation> invitationsFor(String email) {
    return db.list(
        "SELECT s.id, "
            + OWNER_NAME
            + ", a.name, a.currency FROM account_shares s JOIN accounts a ON a.id = s.account_id "
            + "WHERE lower(s.guest_email) = lower(?) AND s.status = 'PENDING' ORDER BY s.created_at",
        rs ->
            new Invitation(
                rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4)),
        email);
  }

  public Optional<Offer> pendingOffer(UUID id, String email) {
    return db.one(
        "SELECT s.id, s.owner_workspace_id, "
            + OWNER_NAME
            + ", a.name, a.currency FROM account_shares s JOIN accounts a ON a.id = s.account_id "
            + "WHERE s.id = ? AND lower(s.guest_email) = lower(?) AND s.status = 'PENDING' FOR UPDATE OF s",
        rs ->
            new Offer(
                rs.getObject(1, UUID.class),
                rs.getObject(2, UUID.class),
                rs.getString(3),
                rs.getString(4),
                rs.getString(5)),
        id,
        email);
  }

  public void activate(UUID id, UUID guestUserId, UUID personId) {
    db.update(
        "UPDATE account_shares SET status = 'ACTIVE', guest_user_id = ?, person_id = ? WHERE id = ?",
        guestUserId,
        personId,
        id);
  }

  public void decline(UUID id) {
    db.update("UPDATE account_shares SET status = 'DECLINED' WHERE id = ?", id);
  }

  public int revoke(UUID ws, UUID id) {
    return db.update(
        "UPDATE account_shares SET status = 'REVOKED' WHERE id = ? AND owner_workspace_id = ? "
            + "AND status IN ('PENDING','ACTIVE')",
        id,
        ws);
  }
}

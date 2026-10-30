package com.keeper.auth;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Singleton
public class RefreshTokenRepository {

  public record Stored(UUID id, UUID userId, UUID familyId, Instant expiresAt, boolean revoked) {}

  private final Db db;

  public RefreshTokenRepository(Db db) {
    this.db = db;
  }

  public void insert(UUID userId, UUID familyId, String hash, Instant expiresAt) {
    db.update(
        "INSERT INTO refresh_tokens(user_id, family_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
        userId,
        familyId,
        hash,
        expiresAt);
  }

  public Optional<Stored> findByHash(String hash) {
    return db.one(
        "SELECT id, user_id, family_id, expires_at, revoked_at IS NOT NULL AS revoked FROM refresh_tokens WHERE token_hash = ?",
        rs ->
            new Stored(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getObject("family_id", UUID.class),
                rs.getObject("expires_at", java.time.OffsetDateTime.class).toInstant(),
                rs.getBoolean("revoked")),
        hash);
  }

  /** Atomically claims a token; false means someone else already used it. */
  public boolean revoke(UUID id) {
    return db.update(
            "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL", id)
        == 1;
  }

  public void revokeFamily(UUID familyId) {
    db.update(
        "UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL",
        familyId);
  }
}

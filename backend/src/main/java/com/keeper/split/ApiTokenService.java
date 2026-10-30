package com.keeper.split;

import com.keeper.auth.TokenService;
import com.keeper.common.db.Db;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Long-lived tokens for the expense-split app. Each is tied to one user and one ledger, is stored
 * only as a hash, and can be revoked. It can post to the inbox and nothing else.
 */
@Singleton
public class ApiTokenService {
  private static final String PREFIX = "ksk_";

  @Serdeable
  public record TokenView(
      UUID id, String name, String prefix, Instant createdAt, Instant lastUsedAt) {}

  @Serdeable
  public record Created(TokenView token, String secret) {}

  public record Owner(UUID workspaceId, UUID userId) {}

  private final Db db;
  private final SecureRandom random = new SecureRandom();

  public ApiTokenService(Db db) {
    this.db = db;
  }

  public Created create(UUID ws, UUID user, String name) {
    byte[] raw = new byte[32];
    random.nextBytes(raw);
    String secret = PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO api_tokens(id, workspace_id, user_id, name, prefix, token_hash) VALUES (?,?,?,?,?,?)",
        id,
        ws,
        user,
        name.trim(),
        secret.substring(0, 10),
        TokenService.hash(secret));
    return new Created(
        list(ws).stream().filter(t -> t.id().equals(id)).findFirst().orElseThrow(), secret);
  }

  public List<TokenView> list(UUID ws) {
    return db.list(
        "SELECT id, name, prefix, created_at, last_used_at FROM api_tokens WHERE workspace_id = ? AND revoked_at IS NULL ORDER BY created_at DESC",
        rs ->
            new TokenView(
                rs.getObject(1, UUID.class),
                rs.getString(2),
                rs.getString(3),
                rs.getObject(4, OffsetDateTime.class).toInstant(),
                rs.getObject(5, OffsetDateTime.class) == null
                    ? null
                    : rs.getObject(5, OffsetDateTime.class).toInstant()),
        ws);
  }

  public void revoke(UUID ws, UUID id) {
    db.update("UPDATE api_tokens SET revoked_at = NOW() WHERE workspace_id = ? AND id = ?", ws, id);
  }

  /** Resolves a presented secret to the ledger it posts into; empty when unknown or revoked. */
  public Optional<Owner> verify(String secret) {
    if (secret == null || !secret.startsWith(PREFIX) || secret.length() > 100)
      return Optional.empty();
    Optional<Owner> owner =
        db.one(
            "SELECT workspace_id, user_id FROM api_tokens WHERE token_hash = ? AND revoked_at IS NULL",
            rs -> new Owner(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class)),
            TokenService.hash(secret));
    owner.ifPresent(
        o ->
            db.update(
                "UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = ?",
                TokenService.hash(secret)));
    return owner;
  }
}

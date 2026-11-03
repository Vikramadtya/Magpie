package com.keeper.capture;

import com.keeper.auth.TokenService;
import com.keeper.common.Actor;
import com.keeper.common.db.Db;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Keys for the quick-add endpoint. A key can only add entries to this ledger's "To review" list; it
 * is shown once when created, stored only as a hash, and can be revoked at any time.
 */
@Controller("/api/v1/workspaces/{workspaceId}/quick-keys")
@io.micronaut.validation.Validated
public class QuickKeyController {
  private static final String PREFIX = "qak_";

  @Serdeable
  public record KeyView(
      UUID id,
      String label,
      String prefix,
      Instant createdAt,
      Instant lastUsedAt,
      String discordUserId) {}

  @Serdeable
  public record Created(KeyView key, String secret) {}

  @Serdeable
  public record Request(
      @NotBlank @Size(max = 60) String label,
      /** Optional: the owner's Discord user id, so /spend and /income in Discord use this key. */
      @Pattern(regexp = "^\\d{5,25}$") String discordUserId) {}

  private final Db db;
  private final SecureRandom random = new SecureRandom();

  public QuickKeyController(Db db) {
    this.db = db;
  }

  private static KeyView map(java.sql.ResultSet rs) throws java.sql.SQLException {
    OffsetDateTime used = rs.getObject("last_used_at", OffsetDateTime.class);
    return new KeyView(
        rs.getObject("id", UUID.class),
        rs.getString("label"),
        rs.getString("key_prefix"),
        rs.getObject("created_at", OffsetDateTime.class).toInstant(),
        used == null ? null : used.toInstant(),
        rs.getString("discord_user_id"));
  }

  @Get
  public List<KeyView> list(@PathVariable UUID workspaceId) {
    return db.list(
        "SELECT id, label, key_prefix, created_at, last_used_at, discord_user_id FROM quick_api_keys "
            + "WHERE workspace_id = ? AND revoked_at IS NULL ORDER BY created_at DESC",
        QuickKeyController::map,
        workspaceId);
  }

  @Post
  public Created create(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body Request body) {
    byte[] raw = new byte[32];
    random.nextBytes(raw);
    String secret = PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO quick_api_keys(id, workspace_id, user_id, label, key_prefix, key_hash, discord_user_id) VALUES (?,?,?,?,?,?,?)",
        id,
        workspaceId,
        Actor.id(auth),
        body.label().trim(),
        secret.substring(0, 8),
        TokenService.hash(secret),
        body.discordUserId() == null || body.discordUserId().isBlank()
            ? null
            : body.discordUserId());
    KeyView view =
        db.one(
                "SELECT id, label, key_prefix, created_at, last_used_at, discord_user_id FROM quick_api_keys WHERE id = ?",
                QuickKeyController::map,
                id)
            .orElseThrow();
    return new Created(view, secret);
  }

  @Delete("/{id}")
  public void revoke(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    db.update(
        "UPDATE quick_api_keys SET revoked_at = NOW() WHERE workspace_id = ? AND id = ? AND revoked_at IS NULL",
        workspaceId,
        id);
  }
}

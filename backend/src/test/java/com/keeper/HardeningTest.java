package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.auth.AuthService;
import com.keeper.common.db.Db;
import com.keeper.common.exception.TooManyRequestsException;
import com.keeper.common.exception.UnauthorizedException;
import io.micronaut.http.HttpRequest;
import jakarta.inject.Inject;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class HardeningTest extends ApiTestBase {

  @Inject AuthService auth;
  @Inject Db db;

  @Test
  void signingInWithGoogleCancelsAPasswordSomeoneElseSetOnThatEmail() {
    String email = "victim-" + UUID.randomUUID() + "@example.com";
    // an attacker registers the victim's email with a password they know
    auth.register(email, "attacker-password-1", "Mallory", "USD");
    assertNotNull(auth.authenticate(email, "attacker-password-1"));

    // the real owner then signs in with Google, which proves the email is theirs
    auth.findOrCreateOauthUser(email, "Victim");

    assertThrows(
        UnauthorizedException.class, () -> auth.authenticate(email, "attacker-password-1"));
  }

  @Test
  void anExistingVerifiedAccountKeepsItsPasswordWhenGoogleLinks() {
    String email = "owner-" + UUID.randomUUID() + "@example.com";
    var created = auth.findOrCreateOauthUser(email, "Owner"); // Google-created: verified
    var again = auth.findOrCreateOauthUser(email, "Owner");
    assertEquals(created.id(), again.id());
  }

  @Test
  void fiveWrongPasswordsLockAnAccountEvenFromDifferentAddresses() {
    String email = "lock-" + UUID.randomUUID() + "@example.com";
    auth.register(email, "correct-horse-1", "Lock", "USD");
    for (int i = 0; i < 5; i++) {
      assertThrows(UnauthorizedException.class, () -> auth.authenticate(email, "wrong-password"));
    }
    // even the right password is refused while locked
    assertThrows(TooManyRequestsException.class, () -> auth.authenticate(email, "correct-horse-1"));
  }

  @Test
  void apiResponsesAreNotCached() {
    Session s = register("nocache");
    var response =
        http().exchange(HttpRequest.GET("/api/v1/me").bearerAuth(s.token()), String.class);
    assertEquals("no-store", response.getHeaders().get("Cache-Control"));
    assertEquals(
        "camera=(), microphone=(), geolocation=()",
        response.getHeaders().get("Permissions-Policy"));
  }

  @Test
  void quickKeysAreShownOnceAndStoredHashed() {
    Session s = register("keys");
    String base = "/api/v1/workspaces/" + s.workspaceId() + "/quick-keys";
    Map<?, ?> created = post(s.token(), base, Map.of("label", "My phone"), Map.class);
    String secret = (String) created.get("secret");
    assertTrue(secret.startsWith("qak_"));

    List<Map<String, Object>> listed = getList(s.token(), base);
    assertEquals(1, listed.size());
    assertFalse(listed.toString().contains(secret), "the key must not be listed again");

    String stored =
        db.one(
                "SELECT key_hash FROM quick_api_keys WHERE workspace_id = ?",
                rs -> rs.getString(1),
                s.workspaceId())
            .orElseThrow();
    assertEquals(com.keeper.auth.TokenService.hash(secret), stored.trim());
    assertFalse(stored.contains(secret));

    http()
        .exchange(
            HttpRequest.DELETE(
                    base + "/" + created.get("key").toString().split("id=")[1].split(",")[0])
                .bearerAuth(s.token()));
    assertEquals(0, getList(s.token(), base).size());
  }

  @Test
  void anotherUserCannotSeeOrCreateKeysInMyLedger() {
    Session mine = register("keys-a");
    Session other = register("keys-b");
    String base = "/api/v1/workspaces/" + mine.workspaceId() + "/quick-keys";
    assertEquals(404, statusOf(HttpRequest.GET(base).bearerAuth(other.token())).getCode());
    assertEquals(
        404,
        statusOf(HttpRequest.POST(base, Map.of("label", "x")).bearerAuth(other.token())).getCode());
  }

  @Test
  void aDiscordAccountLinksToOneActiveKeyOnly() {
    Session s = register("discord-key");
    String base = "/api/v1/workspaces/" + s.workspaceId() + "/quick-keys";
    String discordId = "9" + Math.abs(UUID.randomUUID().getMostSignificantBits() % 1_000_000_000L);

    Map<?, ?> created =
        post(s.token(), base, Map.of("label", "Discord", "discordUserId", discordId), Map.class);
    assertEquals(discordId, ((Map<?, ?>) created.get("key")).get("discordUserId"));
    assertEquals(discordId, getList(s.token(), base).get(0).get("discordUserId"));

    // the same Discord account cannot be linked to a second active key
    assertEquals(
        409,
        statusOf(
                HttpRequest.POST(base, Map.of("label", "Again", "discordUserId", discordId))
                    .bearerAuth(s.token()))
            .getCode());
    // and the id must be a Discord id
    assertEquals(
        400,
        statusOf(
                HttpRequest.POST(base, Map.of("label", "Bad", "discordUserId", "not-an-id"))
                    .bearerAuth(s.token()))
            .getCode());
  }
}

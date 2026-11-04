package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.keeper.auth.TokenService;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.cookie.Cookie;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthApiTest extends ApiTestBase {

  @jakarta.inject.Inject com.keeper.common.db.Db db;

  private HttpRequest<?> login(String email) {
    return HttpRequest.POST(
        "/api/v1/auth/login", Map.of("email", email, "password", "correct-horse-1"));
  }

  @Test
  void registerCreatesWorkspaceWithOwnerRoleAndSeededCategories() {
    Session s = register("alice");
    Map<?, ?> me = get(s.token(), "/api/v1/me", Map.class);
    var ws = (Map<?, ?>) ((java.util.List<?>) me.get("workspaces")).get(0);
    assertEquals("OWNER", ws.get("role"));
  }

  @Test
  void wrongPasswordIs401() {
    String email = "bob-" + UUID.randomUUID() + "@example.com";
    http()
        .exchange(
            HttpRequest.POST(
                "/api/v1/auth/register",
                Map.of("email", email, "password", "correct-horse-1", "name", "Bob")));
    var bad =
        HttpRequest.POST(
            "/api/v1/auth/login", Map.of("email", email, "password", "nope-nope-nope"));
    assertEquals(HttpStatus.UNAUTHORIZED, statusOf(bad));
  }

  @Test
  void protectedRoutesRequireToken() {
    assertEquals(HttpStatus.UNAUTHORIZED, statusOf(HttpRequest.GET("/api/v1/me")));
  }

  @Test
  void refreshAcceptsABodylessPost() {
    String email = "dave-" + UUID.randomUUID() + "@example.com";
    var reg =
        http()
            .exchange(
                HttpRequest.POST(
                    "/api/v1/auth/register",
                    Map.of("email", email, "password", "correct-horse-1", "name", "Dave")),
                Map.class);
    Cookie cookie = reg.getCookie("keeper_rt").orElseThrow();
    // browsers send no Content-Type when there is no body
    assertEquals(
        HttpStatus.OK, statusOf(HttpRequest.POST("/api/v1/auth/refresh", null).cookie(cookie)));
  }

  /** Each call comes from its own address, so these tests do not share the per-IP auth limit. */
  private static String anyIp() {
    return "10."
        + (int) (Math.random() * 250)
        + "."
        + (int) (Math.random() * 250)
        + "."
        + (1 + (int) (Math.random() * 250));
  }

  private Cookie signUp(String name) {
    var reg =
        http()
            .exchange(
                HttpRequest.POST(
                        "/api/v1/auth/register",
                        Map.of(
                            "email",
                            name + "-" + UUID.randomUUID() + "@example.com",
                            "password",
                            "correct-horse-1",
                            "name",
                            name))
                    .header("X-Forwarded-For", anyIp()),
                Map.class);
    return reg.getCookie("keeper_rt").orElseThrow();
  }

  private HttpStatus refresh(Cookie cookie) {
    return statusOf(
        HttpRequest.POST("/api/v1/auth/refresh", "")
            .cookie(cookie)
            .header("X-Forwarded-For", anyIp()));
  }

  @Test
  void refreshRotatesTheToken() {
    Cookie first = signUp("carol");
    var second =
        http()
            .exchange(
                HttpRequest.POST("/api/v1/auth/refresh", "")
                    .cookie(first)
                    .header("X-Forwarded-For", anyIp()),
                Map.class);
    Cookie rotated = second.getCookie("keeper_rt").orElseThrow();
    assertNotEquals(first.getValue(), rotated.getValue());
    assertNotNull(second.body().get("accessToken"));
    assertEquals(HttpStatus.OK, refresh(rotated));
  }

  @Test
  void aRepeatJustAfterRotationIsForgivenButALateReplayEndsTheSession() {
    Cookie first = signUp("dave");
    Cookie rotated =
        http()
            .exchange(
                HttpRequest.POST("/api/v1/auth/refresh", "")
                    .cookie(first)
                    .header("X-Forwarded-For", anyIp()),
                Map.class)
            .getCookie("keeper_rt")
            .orElseThrow();

    // a lost response or a second tab: the same token again within seconds still works
    assertEquals(HttpStatus.OK, refresh(first));

    // later, the same old token is a replay: refused, and the session is ended for good
    db.update(
        "UPDATE refresh_tokens SET revoked_at = NOW() - INTERVAL '5 minutes' WHERE token_hash = ?",
        TokenService.hash(first.getValue()));
    assertEquals(HttpStatus.UNAUTHORIZED, refresh(first));
    assertEquals(HttpStatus.UNAUTHORIZED, refresh(rotated));
  }

  @Test
  void signingOutStopsTheTokenEvenWithinTheGracePeriod() {
    Cookie first = signUp("erin");
    http()
        .exchange(
            HttpRequest.POST("/api/v1/auth/logout", "")
                .cookie(first)
                .header("X-Forwarded-For", anyIp()));
    assertEquals(HttpStatus.UNAUTHORIZED, refresh(first));
  }
}

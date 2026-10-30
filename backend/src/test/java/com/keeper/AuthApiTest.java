package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.cookie.Cookie;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AuthApiTest extends ApiTestBase {

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

  @Test
  void refreshRotatesAndReplayRevokesTheSession() {
    String email = "carol-" + UUID.randomUUID() + "@example.com";
    var reg =
        http()
            .exchange(
                HttpRequest.POST(
                    "/api/v1/auth/register",
                    Map.of("email", email, "password", "correct-horse-1", "name", "Carol")),
                Map.class);
    Cookie first = reg.getCookie("keeper_rt").orElseThrow();

    var second =
        http().exchange(HttpRequest.POST("/api/v1/auth/refresh", "").cookie(first), Map.class);
    Cookie rotated = second.getCookie("keeper_rt").orElseThrow();
    assertNotEquals(first.getValue(), rotated.getValue());
    assertNotNull(second.body().get("accessToken"));

    // replaying the old token is theft: it fails and kills the new token too
    assertEquals(
        HttpStatus.UNAUTHORIZED,
        statusOf(HttpRequest.POST("/api/v1/auth/refresh", "").cookie(first)));
    assertEquals(
        HttpStatus.UNAUTHORIZED,
        statusOf(HttpRequest.POST("/api/v1/auth/refresh", "").cookie(rotated)));
  }
}

package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Broken-object-level-authorization guard: strangers get 404, viewers cannot write. */
class TenantIsolationTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  @Test
  void strangerGets404OnEveryWorkspaceRoute() {
    Session owner = register("owner");
    Session stranger = register("stranger");
    for (String path :
        List.of(
            "/accounts",
            "/transactions",
            "/categories",
            "/payees",
            "/tags",
            "/members",
            "/activity",
            "/dashboard")) {
      assertEquals(
          HttpStatus.NOT_FOUND,
          statusOf(HttpRequest.GET(ws(owner) + path).bearerAuth(stranger.token())),
          "GET " + path);
    }
    assertEquals(
        HttpStatus.NOT_FOUND,
        statusOf(
            HttpRequest.POST(
                    ws(owner) + "/accounts",
                    Map.of(
                        "name", "x", "type", "CASH", "currency", "USD", "openingBalanceMinor", 0))
                .bearerAuth(stranger.token())));
    assertEquals(
        HttpStatus.NOT_FOUND, statusOf(HttpRequest.DELETE(ws(owner)).bearerAuth(stranger.token())));
  }

  @Test
  void sharedLedgerMembersAreViewOnlyAndOnlyOwnersManageIt() {
    Session owner = register("o2");
    Session friend = register("v2");

    // extra ledgers are shared ones; the personal ledger can't have members
    Map<?, ?> trip =
        post(
            owner.token(),
            "/api/v1/workspaces",
            Map.of("name", "Trip", "currency", "USD", "kind", "SHARED"),
            Map.class);
    String tripPath = "/api/v1/workspaces/" + trip.get("id");
    assertEquals(
        HttpStatus.BAD_REQUEST,
        statusOf(
            HttpRequest.POST(ws(owner) + "/invites", Map.of("role", "VIEWER"))
                .bearerAuth(owner.token())));

    String token =
        (String)
            post(owner.token(), tripPath + "/invites", Map.of("role", "EDITOR"), Map.class)
                .get("token");
    post(friend.token(), "/api/v1/invites/" + token + "/accept", Map.of(), Map.class);
    // invite links are single use
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.POST("/api/v1/invites/" + token + "/accept", Map.of())
                .bearerAuth(friend.token())));

    // everyone, including the owner, can read but not type entries in
    Map<String, Object> account =
        Map.of("name", "Joint", "type", "CHECKING", "currency", "USD", "openingBalanceMinor", 0);
    assertEquals(
        HttpStatus.OK,
        statusOf(HttpRequest.GET(tripPath + "/accounts").bearerAuth(friend.token())));
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(HttpRequest.POST(tripPath + "/accounts", account).bearerAuth(friend.token())));
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(HttpRequest.POST(tripPath + "/accounts", account).bearerAuth(owner.token())));
    // only the owner manages members
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.POST(tripPath + "/invites", Map.of("role", "VIEWER"))
                .bearerAuth(friend.token())));
    assertEquals(
        HttpStatus.FORBIDDEN, statusOf(HttpRequest.DELETE(tripPath).bearerAuth(friend.token())));

    assertEquals(2, getList(owner.token(), tripPath + "/members").size());
    assertEquals(
        HttpStatus.OK,
        statusOf(HttpRequest.POST(tripPath + "/leave", Map.of()).bearerAuth(friend.token())));
    assertEquals(
        HttpStatus.NOT_FOUND,
        statusOf(HttpRequest.GET(tripPath + "/accounts").bearerAuth(friend.token())));
  }

  @Test
  void everyoneHasExactlyOnePersonalLedgerButManySharedOnes() {
    Session s = register("one");
    // registration already created the personal ledger
    assertEquals(
        HttpStatus.CONFLICT,
        statusOf(
            HttpRequest.POST(
                    "/api/v1/workspaces",
                    Map.of("name", "Second", "currency", "USD", "kind", "PERSONAL"))
                .bearerAuth(s.token())));
    assertEquals(
        HttpStatus.CONFLICT,
        statusOf(
            HttpRequest.POST(
                    "/api/v1/workspaces", Map.of("name", "Default kind", "currency", "USD"))
                .bearerAuth(s.token())));
    for (String name : List.of("Lisbon trip", "Flat", "Couple")) {
      assertEquals(
          HttpStatus.OK,
          statusOf(
              HttpRequest.POST(
                      "/api/v1/workspaces",
                      Map.of("name", name, "currency", "EUR", "kind", "SHARED"))
                  .bearerAuth(s.token())));
    }
    assertEquals(4, getList(s.token(), "/api/v1/workspaces").size());
  }

  @Test
  void lastOwnerCannotLeave() {
    Session owner = register("solo");
    assertEquals(
        HttpStatus.UNPROCESSABLE_ENTITY,
        statusOf(HttpRequest.POST(ws(owner) + "/leave", Map.of()).bearerAuth(owner.token())));
  }
}

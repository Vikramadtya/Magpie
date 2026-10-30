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
  void everyoneHasOnePersonalLedgerThatIsOnlyTheirs() {
    Session a = register("pa");
    Session b = register("pb");
    assertEquals(1, getList(a.token(), "/api/v1/workspaces").size());
    // there is no way to add people to a ledger or to open a second one
    assertEquals(
        HttpStatus.NOT_FOUND,
        statusOf(
            HttpRequest.POST(ws(a) + "/invites", Map.of("role", "VIEWER")).bearerAuth(a.token())));
    assertEquals(
        HttpStatus.NOT_FOUND, statusOf(HttpRequest.GET(ws(a) + "/members").bearerAuth(a.token())));
    // another user cannot touch it, even with the right id
    assertEquals(
        HttpStatus.NOT_FOUND, statusOf(HttpRequest.GET(ws(a) + "/trips").bearerAuth(b.token())));
  }
}

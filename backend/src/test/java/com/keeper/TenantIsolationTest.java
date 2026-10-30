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
  void invitedViewerCanReadButNotWrite_editorCanWriteButNotManage() {
    Session owner = register("o2");
    Session viewer = register("v2");
    Session editor = register("e2");

    String viewerToken =
        (String)
            post(owner.token(), ws(owner) + "/invites", Map.of("role", "VIEWER"), Map.class)
                .get("token");
    String editorToken =
        (String)
            post(owner.token(), ws(owner) + "/invites", Map.of("role", "EDITOR"), Map.class)
                .get("token");
    post(viewer.token(), "/api/v1/invites/" + viewerToken + "/accept", Map.of(), Map.class);
    post(editor.token(), "/api/v1/invites/" + editorToken + "/accept", Map.of(), Map.class);

    // invite links are single use
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.POST("/api/v1/invites/" + viewerToken + "/accept", Map.of())
                .bearerAuth(editor.token())));

    assertEquals(
        HttpStatus.OK,
        statusOf(HttpRequest.GET(ws(owner) + "/accounts").bearerAuth(viewer.token())));
    Map<String, Object> account =
        Map.of("name", "Joint", "type", "CHECKING", "currency", "USD", "openingBalanceMinor", 0);
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(HttpRequest.POST(ws(owner) + "/accounts", account).bearerAuth(viewer.token())));
    assertEquals(
        HttpStatus.OK,
        statusOf(HttpRequest.POST(ws(owner) + "/accounts", account).bearerAuth(editor.token())));
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.POST(ws(owner) + "/invites", Map.of("role", "VIEWER"))
                .bearerAuth(editor.token())));
    assertEquals(
        HttpStatus.FORBIDDEN, statusOf(HttpRequest.DELETE(ws(owner)).bearerAuth(editor.token())));

    // the member list shows all three; a viewer can leave
    assertEquals(3, getList(owner.token(), ws(owner) + "/members").size());
    assertEquals(
        HttpStatus.OK,
        statusOf(HttpRequest.POST(ws(owner) + "/leave", Map.of()).bearerAuth(viewer.token())));
    assertEquals(
        HttpStatus.NOT_FOUND,
        statusOf(HttpRequest.GET(ws(owner) + "/accounts").bearerAuth(viewer.token())));
  }

  @Test
  void lastOwnerCannotLeave() {
    Session owner = register("solo");
    assertEquals(
        HttpStatus.UNPROCESSABLE_ENTITY,
        statusOf(HttpRequest.POST(ws(owner) + "/leave", Map.of()).bearerAuth(owner.token())));
  }
}

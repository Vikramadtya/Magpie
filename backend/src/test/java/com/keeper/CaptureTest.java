package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.keeper.common.db.Db;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CaptureTest extends ApiTestBase {

  @Inject Db db;

  private UUID insertCapture(Session s, String account, long amount) {
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO quick_captures(id, workspace_id, user_id, type, amount_minor, currency, occurred_on, account_id, payee_text, note) "
            + "VALUES (?,?,?,?,?,?,?,?,?,?)",
        id,
        s.workspaceId(),
        s.userId(),
        "EXPENSE",
        amount,
        "USD",
        LocalDate.now(),
        UUID.fromString(account),
        "Swiggy",
        "lunch");
    return id;
  }

  @Test
  void quickAddsWaitInTheReviewListUntilAccepted() {
    Session s = register("capture");
    String ws = "/api/v1/workspaces/" + s.workspaceId();
    String acc =
        (String)
            post(
                    s.token(),
                    ws + "/accounts",
                    Map.of(
                        "name",
                        "Card",
                        "type",
                        "CHECKING",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        100_000),
                    Map.class)
                .get("id");
    UUID first = insertCapture(s, acc, 4_500);
    UUID second = insertCapture(s, acc, 900);

    assertEquals(2, getList(s.token(), ws + "/captures").size());
    assertEquals(
        2, ((Number) get(s.token(), ws + "/inbox/count", Map.class).get("count")).intValue());
    // nothing is recorded until it is accepted
    assertEquals(
        100_000,
        ((Number) get(s.token(), ws + "/accounts/" + acc, Map.class).get("balanceMinor"))
            .intValue());

    post(s.token(), ws + "/captures/" + first + "/accept", Map.of("accountId", acc), Map.class);
    assertEquals(
        95_500,
        ((Number) get(s.token(), ws + "/accounts/" + acc, Map.class).get("balanceMinor"))
            .intValue());
    Map<?, ?> page = get(s.token(), ws + "/transactions?accountId=" + acc, Map.class);
    Map<?, ?> tx = (Map<?, ?>) ((List<?>) page.get("items")).get(0);
    assertEquals("Swiggy", tx.get("payeeName"));
    assertEquals("lunch", tx.get("note"));

    // accepting twice does not record twice
    assertEquals(
        409,
        statusOf(
                io.micronaut.http.HttpRequest.POST(
                        ws + "/captures/" + first + "/accept", Map.of("accountId", acc))
                    .bearerAuth(s.token()))
            .getCode());

    post(s.token(), ws + "/captures/" + second + "/dismiss", Map.of(), Map.class);
    assertEquals(0, getList(s.token(), ws + "/captures").size());
    assertEquals(
        0, ((Number) get(s.token(), ws + "/inbox/count", Map.class).get("count")).intValue());
  }

  @Test
  void anotherUsersQuickAddsAreNotVisible() {
    Session mine = register("cap-a");
    Session other = register("cap-b");
    String otherWs = "/api/v1/workspaces/" + other.workspaceId();
    String acc =
        (String)
            post(
                    other.token(),
                    otherWs + "/accounts",
                    Map.of(
                        "name",
                        "Card",
                        "type",
                        "CHECKING",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        0),
                    Map.class)
                .get("id");
    insertCapture(other, acc, 100);
    var request =
        io.micronaut.http.HttpRequest.GET("/api/v1/workspaces/" + other.workspaceId() + "/captures")
            .bearerAuth(mine.token());
    assertEquals(404, statusOf(request).getCode());
  }
}

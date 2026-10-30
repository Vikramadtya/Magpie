package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import io.micronaut.http.HttpRequest;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class HouseholdTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private long num(Object o) {
    return ((Number) o).longValue();
  }

  private String emailOf(Session s) {
    return (String) ((Map<?, ?>) get(s.token(), "/api/v1/me", Map.class).get("user")).get("email");
  }

  private Map<String, Object> category(Session s) {
    return getList(s.token(), ws(s) + "/categories").stream()
        .filter(c -> "EXPENSE".equals(c.get("kind")) && c.get("parentId") == null)
        .findFirst()
        .orElseThrow();
  }

  private String account(Session s, String name, long opening) {
    return (String)
        post(
                s.token(),
                ws(s) + "/accounts",
                Map.of(
                    "name",
                    name,
                    "type",
                    "CHECKING",
                    "currency",
                    "USD",
                    "openingBalanceMinor",
                    opening),
                Map.class)
            .get("id");
  }

  private void spend(Session s, String account, long amount) {
    post(
        s.token(),
        ws(s) + "/transactions",
        Map.of(
            "accountId",
            account,
            "type",
            "EXPENSE",
            "amountMinor",
            amount,
            "occurredOn",
            LocalDate.now().toString(),
            "categoryId",
            category(s).get("id")),
        Map.class);
  }

  private Map<?, ?> summary(Session s, String household) {
    return get(
        s.token(),
        "/api/v1/households/" + household + "/summary?month=" + YearMonth.now(),
        Map.class);
  }

  private void ok(HttpRequest<?> request) {
    assertEquals(200, exchange(request).getStatus().getCode());
  }

  private String household(Session a, Session b) {
    Map<?, ?> h = post(a.token(), "/api/v1/households", Map.of("name", "Home"), Map.class);
    String id = (String) h.get("id");
    ok(
        HttpRequest.POST("/api/v1/households/" + id + "/members", Map.of("email", emailOf(b)))
            .bearerAuth(a.token()));
    Map<?, ?> invited = (Map<?, ?>) getList(b.token(), "/api/v1/households").get(0);
    assertEquals("PENDING", invited.get("myStatus"));
    assertEquals(0, ((List<?>) invited.get("members")).size());
    ok(HttpRequest.POST("/api/v1/households/" + id + "/accept", Map.of()).bearerAuth(b.token()));
    return id;
  }

  @Test
  void combinesBothLedgersAndCountsALentCardOnce() {
    Session a = register("hh-a");
    Session b = register("hh-b");
    String cardA = account(a, "Card", 1_000_000);
    String cardB = account(b, "Mine", 500_000);
    String h = household(a, b);

    spend(a, cardA, 30_000);
    spend(b, cardB, 20_000);
    assertEquals(50_000, num(summary(a, h).get("spentMinor")));

    // B spends 10,000 on A's lent card: it lands in both ledgers, but is one purchase.
    post(
        a.token(),
        ws(a) + "/accounts/" + cardA + "/shares",
        Map.of("email", emailOf(b)),
        Map.class);
    String invite = (String) getList(b.token(), "/api/v1/lending/invitations").get(0).get("id");
    String memo =
        (String)
            post(
                    b.token(),
                    "/api/v1/lending/invitations/" + invite + "/accept",
                    Map.of(),
                    Map.class)
                .get("id");
    spend(b, memo, 10_000);
    assertEquals(60_000, num(summary(a, h).get("spentMinor")));

    // If B stops sharing spending, her purchase on the lent card is still counted from A's side.
    ok(
        HttpRequest.PUT(
                "/api/v1/households/" + h + "/sharing",
                Map.of("spending", false, "netWorth", true, "investments", false))
            .bearerAuth(b.token()));
    Map<?, ?> alone = summary(a, h);
    assertEquals(40_000, num(alone.get("spentMinor")));
    assertEquals(List.of("hh-b"), alone.get("notSharing"));

    // Net worth only includes what is shared, and never the lent card.
    Map<?, ?> wealth = get(a.token(), "/api/v1/households/" + h + "/wealth", Map.class);
    assertEquals(
        500_000 - 20_000 - 10_000 + 10_000,
        num(wealth.get("netWorthMinor")) + 10_000 - 10_000 + 0 * 1);
  }

  @Test
  void householdBudgetsTrackBothMembers() {
    Session a = register("hh-c");
    Session b = register("hh-d");
    String cardA = account(a, "Card", 100_000);
    String cardB = account(b, "Mine", 100_000);
    String h = household(a, b);
    String food = (String) category(a).get("name");

    ok(
        HttpRequest.PUT(
                "/api/v1/households/" + h + "/budgets",
                Map.of("categoryName", food, "amountMinor", 100_000))
            .bearerAuth(b.token()));
    spend(a, cardA, 30_000);
    spend(b, cardB, 50_000);

    Map<?, ?> line = (Map<?, ?>) ((List<?>) summary(a, h).get("budgets")).get(0);
    assertEquals(80_000, num(line.get("spentMinor")));
    assertEquals(20_000, num(line.get("remainingMinor")));
  }

  @Test
  void outsidersCannotSeeAHousehold() {
    Session a = register("hh-e");
    Session b = register("hh-f");
    Session stranger = register("hh-x");
    String h = household(a, b);
    var res =
        exchange(
            HttpRequest.GET("/api/v1/households/" + h + "/summary").bearerAuth(stranger.token()));
    assertEquals(404, res.getStatus().getCode());
    assertEquals(0, getList(stranger.token(), "/api/v1/households").size());
  }
}

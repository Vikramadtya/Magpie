package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import io.micronaut.http.HttpRequest;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SpentByTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private long num(Object o) {
    return ((Number) o).longValue();
  }

  private String category(Session s) {
    return (String)
        getList(s.token(), ws(s) + "/categories").stream()
            .filter(c -> "EXPENSE".equals(c.get("kind")) && c.get("parentId") == null)
            .findFirst()
            .orElseThrow()
            .get("id");
  }

  private Map<?, ?> spend(Session s, String acc, String cat, long amount, String personId) {
    Map<String, Object> body = new java.util.HashMap<>();
    body.put("accountId", acc);
    body.put("type", "EXPENSE");
    body.put("amountMinor", amount);
    body.put("occurredOn", LocalDate.now().toString());
    body.put("categoryId", cat);
    if (personId != null) body.put("spentById", personId);
    return post(s.token(), ws(s) + "/transactions", body, Map.class);
  }

  private void budget(Session s, String cat, boolean includeOthers) {
    http()
        .exchange(
            HttpRequest.PUT(
                    ws(s) + "/budgets/" + cat + "/" + YearMonth.now(),
                    Map.of(
                        "amountMinor", 100_000, "rollover", false, "includeOthers", includeOthers))
                .bearerAuth(s.token()));
  }

  private long budgetSpent(Session s) {
    Map<?, ?> summary = get(s.token(), ws(s) + "/budgets?month=" + YearMonth.now(), Map.class);
    return num(((Map<?, ?>) ((List<?>) summary.get("lines")).get(0)).get("spentMinor"));
  }

  @Test
  void othersSpendingIsKeptOutOfYourPictureUnlessABudgetOptsIn() {
    Session s = register("spentby");
    String acc =
        (String)
            post(
                    s.token(),
                    ws(s) + "/accounts",
                    Map.of(
                        "name",
                        "Card",
                        "type",
                        "CHECKING",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        1_000_000),
                    Map.class)
                .get("id");
    String cat = category(s);
    String wife =
        (String) post(s.token(), ws(s) + "/people", Map.of("name", "Wife"), Map.class).get("id");

    spend(s, acc, cat, 30_000, null);
    Map<?, ?> hers = spend(s, acc, cat, 50_000, wife);
    assertEquals("Wife", hers.get("spentByName"));

    // The card is charged either way.
    Map<?, ?> account = get(s.token(), ws(s) + "/accounts/" + acc, Map.class);
    assertEquals(1_000_000 - 80_000, num(account.get("balanceMinor")));

    budget(s, cat, false);
    assertEquals(30_000, budgetSpent(s));
    budget(s, cat, true);
    assertEquals(80_000, budgetSpent(s));

    Map<?, ?> dash = get(s.token(), ws(s) + "/dashboard", Map.class);
    assertEquals(30_000, num(dash.get("expenseMinor")));
    List<?> others = (List<?>) dash.get("spentByOthers");
    assertEquals(1, others.size());
    assertEquals(50_000, num(((Map<?, ?>) others.get(0)).get("expenseMinor")));

    Map<?, ?> byCategory = get(s.token(), ws(s) + "/analytics/spending-by-category", Map.class);
    assertEquals(
        30_000, num(((Map<?, ?>) ((List<?>) byCategory.get("items")).get(0)).get("totalMinor")));

    Map<?, ?> hersOnly = get(s.token(), ws(s) + "/transactions?spentBy=" + wife, Map.class);
    assertEquals(1, ((List<?>) hersOnly.get("items")).size());
    Map<?, ?> mine = get(s.token(), ws(s) + "/transactions?spentBy=me", Map.class);
    assertEquals(1, ((List<?>) mine.get("items")).size());
  }

  @Test
  void removingAPersonGivesTheirTransactionsBackToYou() {
    Session s = register("spentby2");
    String acc =
        (String)
            post(
                    s.token(),
                    ws(s) + "/accounts",
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
    String cat = category(s);
    String kid =
        (String) post(s.token(), ws(s) + "/people", Map.of("name", "Kid"), Map.class).get("id");
    String tx = (String) spend(s, acc, cat, 1_000, kid).get("id");

    post(
        s.token(),
        ws(s) + "/transactions/bulk",
        Map.of("action", "SPENT_BY", "ids", List.of(tx)),
        Map.class);
    assertNull(get(s.token(), ws(s) + "/transactions/" + tx, Map.class).get("spentById"));

    post(
        s.token(),
        ws(s) + "/transactions/bulk",
        Map.of("action", "SPENT_BY", "ids", List.of(tx), "personId", kid),
        Map.class);
    http().exchange(HttpRequest.DELETE(ws(s) + "/people/" + kid).bearerAuth(s.token()));
    assertNull(get(s.token(), ws(s) + "/transactions/" + tx, Map.class).get("spentById"));
  }

  @Test
  void youCannotUseSomeoneElsesPerson() {
    Session a = register("owner");
    Session b = register("other");
    String theirs =
        (String) post(b.token(), ws(b) + "/people", Map.of("name", "X"), Map.class).get("id");
    String acc =
        (String)
            post(
                    a.token(),
                    ws(a) + "/accounts",
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
    var res =
        exchange(
            HttpRequest.POST(
                    ws(a) + "/transactions",
                    Map.of(
                        "accountId",
                        acc,
                        "type",
                        "EXPENSE",
                        "amountMinor",
                        100,
                        "occurredOn",
                        LocalDate.now().toString(),
                        "spentById",
                        theirs))
                .bearerAuth(a.token()));
    assertEquals(400, res.getStatus().getCode());
  }
}

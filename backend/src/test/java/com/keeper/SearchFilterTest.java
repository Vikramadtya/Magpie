package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micronaut.http.HttpRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SearchFilterTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String account(Session s, String name) {
    return (String)
        post(
                s.token(),
                ws(s) + "/accounts",
                Map.of(
                    "name", name, "type", "CHECKING", "currency", "USD", "openingBalanceMinor", 0),
                Map.class)
            .get("id");
  }

  private Map<String, Object> category(Session s, String name, String parent) {
    var body = new java.util.HashMap<String, Object>();
    body.put("name", name);
    body.put("kind", "EXPENSE");
    if (parent != null) body.put("parentId", parent);
    return post(s.token(), ws(s) + "/categories", body, Map.class);
  }

  private void spend(
      Session s, String acc, long amount, String cat, String payee, String note, String date) {
    var body = new java.util.HashMap<String, Object>();
    body.put("accountId", acc);
    body.put("type", "EXPENSE");
    body.put("amountMinor", amount);
    body.put("occurredOn", date);
    if (cat != null) body.put("categoryId", cat);
    if (note != null) body.put("note", note);
    if (payee != null) {
      String payeeId =
          (String) post(s.token(), ws(s) + "/payees", Map.of("name", payee), Map.class).get("id");
      body.put("payeeId", payeeId);
    }
    post(s.token(), ws(s) + "/transactions", body, Map.class);
  }

  private List<?> items(Session s, String query) {
    return (List<?>) get(s.token(), ws(s) + "/transactions?" + query, Map.class).get("items");
  }

  private long num(Object o) {
    return ((Number) o).longValue();
  }

  @Test
  void filtersSortsAndSearchesNotesEvenThoughTheyAreEncrypted() {
    Session s = register("search");
    String a = account(s, "Card");
    String b = account(s, "Cash");
    String food = (String) category(s, "Eating out", null).get("id");
    String cafe = (String) category(s, "Cafes", food).get("id");
    String today = LocalDate.now().toString();

    spend(s, a, 50_000, cafe, "Blue Tokai", "birthday coffee", today);
    spend(s, a, 120_000, food, "Dominos", "team dinner", today);
    spend(s, b, 800, null, null, "bus fare", today);
    spend(s, b, 250_000, null, "Rent Co", null, today);

    // amount range
    assertEquals(2, items(s, "minAmount=40000&maxAmount=130000").size());
    // several accounts at once
    assertEquals(4, items(s, "accountIds=" + a + "," + b).size());
    assertEquals(2, items(s, "accountIds=" + b).size());
    // a parent category includes its sub-categories
    assertEquals(2, items(s, "categoryIds=" + food).size());
    // only what has no category
    assertEquals(2, items(s, "uncategorised=true").size());
    // notes are searchable: they are stored encrypted, so this proves the in-app search works
    assertEquals(1, items(s, "q=birthday").size());
    assertEquals(1, items(s, "q=" + "coffee+blue").size());
    assertEquals(0, items(s, "q=nonexistentword").size());
    // search also covers payee, category and account names
    assertEquals(1, items(s, "q=dominos").size());
    assertEquals(2, items(s, "q=cash").size());

    // sorting by amount, and paging in that order
    var byAmount = items(s, "sort=amount_desc");
    assertEquals(250_000, num(((Map<?, ?>) byAmount.get(0)).get("amountMinor")));
    Map<?, ?> firstPage =
        get(s.token(), ws(s) + "/transactions?sort=amount_asc&limit=3", Map.class);
    assertEquals(3, ((List<?>) firstPage.get("items")).size());
    String next = (String) firstPage.get("nextCursor");
    assertTrue(next != null);
    Map<?, ?> secondPage =
        get(s.token(), ws(s) + "/transactions?sort=amount_asc&limit=3&cursor=" + next, Map.class);
    assertEquals(1, ((List<?>) secondPage.get("items")).size());
    assertEquals(
        250_000, num(((Map<?, ?>) ((List<?>) secondPage.get("items")).get(0)).get("amountMinor")));

    // search results page by position too
    Map<?, ?> found = get(s.token(), ws(s) + "/transactions?q=cash&limit=1", Map.class);
    assertEquals(1, ((List<?>) found.get("items")).size());
    assertTrue(found.get("nextCursor") != null);

    // summary of whatever matches
    Map<?, ?> all = get(s.token(), ws(s) + "/transactions/summary", Map.class);
    assertEquals(4, num(all.get("count")));
    assertEquals(50_000 + 120_000 + 800 + 250_000, num(all.get("expenseMinor")));
    Map<?, ?> searched = get(s.token(), ws(s) + "/transactions/summary?q=bus", Map.class);
    assertEquals(1, num(searched.get("count")));
    assertEquals(800, num(searched.get("expenseMinor")));
  }

  @Test
  void aBadIdInAFilterIsRefusedNotIgnored() {
    Session s = register("search-bad");
    assertEquals(
        400,
        statusOf(
                HttpRequest.GET(ws(s) + "/transactions?accountIds=not-a-uuid")
                    .bearerAuth(s.token()))
            .getCode());
    assertEquals(
        400,
        statusOf(HttpRequest.GET(ws(s) + "/transactions?sort=sideways").bearerAuth(s.token()))
            .getCode());
  }

  @Test
  void oneSearchFindsThingsAcrossTheLedger() {
    Session s = register("global");
    String acc = account(s, "Holiday fund");
    post(s.token(), ws(s) + "/payees", Map.of("name", "Holiday Inn"), Map.class);
    String today = LocalDate.now().toString();
    spend(s, acc, 9_900, null, null, "holiday snacks", today);

    List<Map<String, Object>> hits = getList(s.token(), ws(s) + "/search?q=holiday");
    var kinds = hits.stream().map(h -> (String) h.get("kind")).toList();
    assertTrue(kinds.contains("account"), kinds.toString());
    assertTrue(kinds.contains("payee"), kinds.toString());
    assertTrue(kinds.contains("transaction"), kinds.toString());

    assertEquals(
        400, statusOf(HttpRequest.GET(ws(s) + "/search?q=x").bearerAuth(s.token())).getCode());
  }

  @Test
  void anotherUsersLedgerCannotBeSearched() {
    Session mine = register("global-a");
    Session other = register("global-b");
    assertEquals(
        404,
        statusOf(HttpRequest.GET(ws(mine) + "/search?q=anything").bearerAuth(other.token()))
            .getCode());
  }
}

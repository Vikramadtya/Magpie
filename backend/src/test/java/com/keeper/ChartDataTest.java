package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.common.db.Db;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ChartDataTest extends ApiTestBase {

  @Inject Db db;

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String account(Session s, String name, String type, int opening) {
    return (String)
        post(
                s.token(),
                ws(s) + "/accounts",
                Map.of(
                    "name", name, "type", type, "currency", "USD", "openingBalanceMinor", opening),
                Map.class)
            .get("id");
  }

  private String category(Session s, String name, String parent) {
    Map<String, Object> body = new HashMap<>(Map.of("name", name, "kind", "EXPENSE"));
    if (parent != null) body.put("parentId", parent);
    return (String) post(s.token(), ws(s) + "/categories", body, Map.class).get("id");
  }

  private void spend(Session s, String acc, String cat, int minor, LocalDate on, String payee) {
    Map<String, Object> body =
        new HashMap<>(
            Map.of(
                "accountId",
                acc,
                "type",
                "EXPENSE",
                "amountMinor",
                minor,
                "occurredOn",
                on.toString()));
    if (cat != null) body.put("categoryId", cat);
    if (payee != null)
      body.put(
          "payeeId",
          post(s.token(), ws(s) + "/payees", Map.of("name", payee), Map.class).get("id"));
    post(s.token(), ws(s) + "/transactions", body, Map.class);
  }

  private List<Map<String, Object>> rows(Session s, String query) {
    var result = get(s.token(), ws(s) + "/analytics/breakdown?" + query, Map.class);
    @SuppressWarnings("unchecked")
    var rows = (List<Map<String, Object>>) result.get("rows");
    return rows;
  }

  private long total(Map<String, Object> row) {
    return ((Number) row.get("totalMinor")).longValue();
  }

  @Test
  void breakdownGroupsByCategoryMonthAndRestFoldsIntoOther() {
    Session s = register("break");
    String acc = account(s, "Card", "CREDIT_CARD", 0);
    String food = category(s, "Food Z", null);
    String cafe = category(s, "Cafe Z", food);
    LocalDate now = LocalDate.now().withDayOfMonth(1);
    spend(s, acc, food, 1_000, now, "Shop");
    spend(s, acc, cafe, 500, now, "Beans");
    spend(s, acc, null, 250, now.minusMonths(1), null);

    String range = "from=" + now.minusMonths(1) + "&to=" + now.plusDays(27);
    var byCategory = rows(s, range + "&by=category");
    var foodRow =
        byCategory.stream().filter(r -> "Food Z".equals(r.get("label"))).findFirst().orElseThrow();
    assertEquals(1_500, total(foodRow)); // a sub-category rolls up into its parent
    assertTrue(byCategory.stream().anyMatch(r -> "Uncategorised".equals(r.get("label"))));

    var monthly = rows(s, range + "&by=none&bucket=month");
    assertEquals(2, monthly.size());
    assertEquals(
        List.of(YearMonth.from(now.minusMonths(1)).toString(), YearMonth.from(now).toString()),
        monthly.stream().map(r -> (String) r.get("bucket")).toList());

    var subs = rows(s, range + "&by=subcategory&categoryId=" + food);
    assertEquals(
        List.of("Food Z", "Cafe Z"), subs.stream().map(r -> (String) r.get("label")).toList());

    var capped = rows(s, range + "&by=payee&limit=1");
    assertEquals(2, capped.size());
    assertTrue(capped.stream().anyMatch(r -> "Everything else".equals(r.get("label"))));
  }

  @Test
  void breakdownRejectsUnknownGroupingsAndSeparatesWhatOthersSpent() {
    Session s = register("break-bad");
    var bad = HttpRequest.GET(ws(s) + "/analytics/breakdown?by=password").bearerAuth(s.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(bad));

    String acc = account(s, "Card", "CREDIT_CARD", 0);
    String person =
        (String) post(s.token(), ws(s) + "/people", Map.of("name", "Asha"), Map.class).get("id");
    post(
        s.token(),
        ws(s) + "/transactions",
        Map.of(
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            700,
            "occurredOn",
            LocalDate.now().toString(),
            "spentById",
            person),
        Map.class);
    spend(s, acc, null, 300, LocalDate.now(), null);

    assertEquals(300, total(rows(s, "by=none").get(0))); // yours only
    var others = rows(s, "by=person");
    assertEquals(1, others.size());
    assertEquals("Asha", others.get(0).get("label"));
    assertEquals(700, total(others.get(0)));
  }

  @Test
  void sizesPurchasesAndTreeDescribeIndividualSpending() {
    Session s = register("shapes");
    String acc = account(s, "Card", "CREDIT_CARD", 0);
    String cat = category(s, "Fun Z", null);
    for (int i = 1; i <= 20; i++)
      spend(s, acc, cat, i * 1_000, LocalDate.now(), i % 2 == 0 ? "Even" : "Odd");

    var sizes = get(s.token(), ws(s) + "/analytics/sizes", Map.class);
    assertEquals(20, ((Number) sizes.get("total")).intValue());
    @SuppressWarnings("unchecked")
    var buckets = (List<Map<String, Object>>) sizes.get("buckets");
    assertEquals(20, buckets.stream().mapToInt(b -> ((Number) b.get("count")).intValue()).sum());

    var purchases = get(s.token(), ws(s) + "/analytics/purchases?limit=3", Map.class);
    @SuppressWarnings("unchecked")
    var items = (List<Map<String, Object>>) purchases.get("items");
    assertEquals(3, items.size());
    assertEquals(20_000, ((Number) items.get(0).get("amountMinor")).intValue());

    var tree = get(s.token(), ws(s) + "/analytics/tree", Map.class);
    @SuppressWarnings("unchecked")
    var leaves = (List<Map<String, Object>>) tree.get("leaves");
    assertEquals(2, leaves.size());
    assertEquals("Fun Z", leaves.get(0).get("category"));
  }

  @Test
  void wealthInvestmentsLoansGoalsAndBudgetsHistories() {
    Session s = register("wealthy");
    String save = account(s, "Rainy", "SAVINGS", 50_000);
    String card = account(s, "Visa", "CREDIT_CARD", -10_000);
    String cat = category(s, "Rent Z", null);
    spend(s, card, cat, 2_000, LocalDate.now(), null);

    var wealth = get(s.token(), ws(s) + "/analytics/wealth?months=3", Map.class);
    assertEquals(3, ((List<?>) wealth.get("months")).size());
    @SuppressWarnings("unchecked")
    var accounts = (List<Map<String, Object>>) wealth.get("accounts");
    var rainy =
        accounts.stream().filter(a -> "Rainy".equals(a.get("name"))).findFirst().orElseThrow();
    assertEquals(50_000, ((Number) ((List<?>) rainy.get("values")).get(2)).intValue());

    // Prices are recorded as they change, so a gold coin gets a value history.
    post(
        s.token(),
        ws(s) + "/holdings",
        Map.of(
            "name",
            "Gold bar",
            "assetType",
            "GOLD",
            "quantity",
            1,
            "unitPriceMinor",
            5_000,
            "priceMinor",
            5_000,
            "currency",
            "USD"),
        Map.class);
    var invest = get(s.token(), ws(s) + "/analytics/investments", Map.class);
    assertEquals(1, ((List<?>) invest.get("holdings")).size());
    assertFalse(((List<?>) invest.get("ownValues")).isEmpty());
    assertEquals(
        1L,
        db.count("SELECT count(*) FROM holding_values WHERE workspace_id = ?", s.workspaceId()));

    String loan =
        (String)
            post(
                    s.token(),
                    ws(s) + "/loans",
                    Map.of(
                        "person",
                        "Ravi",
                        "direction",
                        "LENT",
                        "accountId",
                        save,
                        "amountMinor",
                        4_000,
                        "occurredOn",
                        LocalDate.now().toString()),
                    Map.class)
                .get("id");
    post(
        s.token(),
        ws(s) + "/loans/" + loan + "/payments",
        Map.of("accountId", save, "amountMinor", 1_000, "occurredOn", LocalDate.now().toString()),
        Map.class);
    var loans = get(s.token(), ws(s) + "/analytics/loans?months=2", Map.class);
    @SuppressWarnings("unchecked")
    var history = (List<Map<String, Object>>) loans.get("history");
    assertEquals(3_000, ((Number) history.get(1).get("owedToMeMinor")).intValue());
    @SuppressWarnings("unchecked")
    var people = (List<Map<String, Object>>) loans.get("people");
    assertEquals(4_000, ((Number) people.get(0).get("lentMinor")).intValue());
    assertEquals(1_000, ((Number) people.get(0).get("lentRepaidMinor")).intValue());

    String goal =
        (String)
            post(
                    s.token(),
                    ws(s) + "/goals",
                    Map.of("name", "Trip", "targetMinor", 10_000, "currency", "USD"),
                    Map.class)
                .get("id");
    post(
        s.token(),
        ws(s) + "/goals/" + goal + "/contributions",
        Map.of("amountMinor", 2_500, "occurredOn", LocalDate.now().toString()),
        Map.class);
    var goals = getList(s.token(), ws(s) + "/analytics/goals");
    assertEquals(2_500, ((Number) goals.get(0).get("savedMinor")).intValue());

    http()
        .exchange(
            HttpRequest.PUT(
                    ws(s) + "/budgets/" + cat + "/" + YearMonth.now(),
                    Map.of("amountMinor", 5_000, "rollover", false, "includeOthers", false))
                .bearerAuth(s.token()));
    var budgets = getList(s.token(), ws(s) + "/analytics/budgets?months=2");
    assertEquals(2, budgets.size());
  }

  @Test
  void anotherWorkspaceSeesNoneOfIt() {
    Session a = register("owner-a");
    Session b = register("owner-b");
    spend(a, account(a, "Card", "CREDIT_CARD", 0), null, 900, LocalDate.now(), null);
    assertTrue(rows(b, "by=none").isEmpty());
    var forbidden = HttpRequest.GET(ws(a) + "/analytics/breakdown?by=none").bearerAuth(b.token());
    assertTrue(statusOf(forbidden).getCode() >= 400);
    assertEquals(
        0L,
        db.count("SELECT count(*) FROM holding_values WHERE workspace_id = ?", UUID.randomUUID()));
  }
}

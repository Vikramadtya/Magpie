package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class OverviewTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private long num(Object o) {
    return ((Number) o).longValue();
  }

  private void add(Session s, String account, String type, long amount, LocalDate on, String cat) {
    Map<String, Object> body = new java.util.HashMap<>();
    body.put("accountId", account);
    body.put("type", type);
    body.put("amountMinor", amount);
    body.put("occurredOn", on.toString());
    if (cat != null) body.put("categoryId", cat);
    post(s.token(), ws(s) + "/transactions", body, Map.class);
  }

  @Test
  void comparesWithThePreviousPeriodAndFeedsTheDashboard() {
    Session s = register("overview");
    String account =
        (String)
            post(
                    s.token(),
                    ws(s) + "/accounts",
                    Map.of(
                        "name",
                        "Main",
                        "type",
                        "CHECKING",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        0),
                    Map.class)
                .get("id");
    String cat =
        (String)
            getList(s.token(), ws(s) + "/categories").stream()
                .filter(c -> "EXPENSE".equals(c.get("kind")) && c.get("parentId") == null)
                .findFirst()
                .orElseThrow()
                .get("id");

    YearMonth now = YearMonth.now();
    LocalDate thisMonth = now.atDay(1);
    LocalDate lastMonth = now.minusMonths(1).atDay(1);
    add(s, account, "INCOME", 500_000, thisMonth, null);
    add(s, account, "EXPENSE", 120_000, thisMonth, cat);
    add(s, account, "EXPENSE", 80_000, lastMonth, cat);

    Map<?, ?> o =
        get(
            s.token(),
            ws(s) + "/analytics/overview?from=" + thisMonth + "&to=" + now.atEndOfMonth(),
            Map.class);
    Map<?, ?> current = (Map<?, ?>) o.get("current");
    Map<?, ?> previous = (Map<?, ?>) o.get("previous");
    assertEquals(120_000, num(current.get("expenseMinor")));
    assertEquals(380_000, num(current.get("savingsMinor")));
    assertEquals(76, num(current.get("savingsRatePercent")));
    assertEquals(80_000, num(previous.get("expenseMinor")));
    Map<?, ?> change = (Map<?, ?>) ((List<?>) o.get("categoryChanges")).get(0);
    assertEquals(120_000, num(change.get("currentMinor")));
    assertEquals(80_000, num(change.get("previousMinor")));
    assertEquals(1, ((List<?>) o.get("largest")).size());
    long daily = ((List<?>) o.get("dailySpend")).stream().mapToLong(this::num).sum();
    assertEquals(120_000, daily);
    assertEquals(6, ((List<?>) o.get("monthly")).size());

    Map<?, ?> dash = get(s.token(), ws(s) + "/dashboard", Map.class);
    assertEquals(80_000, num(dash.get("previousExpenseMinor")));
    assertEquals(now.lengthOfMonth(), ((List<?>) dash.get("dailySpend")).size());
    assertEquals(
        now.minusMonths(1).lengthOfMonth(), ((List<?>) dash.get("previousDailySpend")).size());
    assertTrue(((List<?>) dash.get("topCategories")).size() >= 1);
  }
}

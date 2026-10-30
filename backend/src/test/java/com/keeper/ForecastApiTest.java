package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class ForecastApiTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String categoryId(Session s, String name) {
    return (String)
        getList(s.token(), ws(s) + "/categories").stream()
            .filter(c -> name.equals(c.get("name")))
            .findFirst()
            .orElseThrow()
            .get("id");
  }

  private void spend(
      Session s, String acc, long amount, LocalDate date, String category, String payee) {
    Map<String, Object> body =
        new java.util.HashMap<>(
            Map.of(
                "accountId",
                acc,
                "type",
                "EXPENSE",
                "amountMinor",
                amount,
                "occurredOn",
                date.toString(),
                "categoryId",
                category));
    if (payee != null) body.put("payeeId", payee);
    post(s.token(), ws(s) + "/transactions", body, Map.class);
  }

  @Test
  void forecastCombinesFixedRulesWithHistoryAndInsightsFindPatterns() {
    Session s = register("fc");
    String acc =
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
                        5_000_000),
                    Map.class)
                .get("id");
    String food = categoryId(s, "Food");
    String transport = categoryId(s, "Transport");
    YearMonth next = YearMonth.now().plusMonths(1);

    // fixed items for next month
    post(
        s.token(),
        ws(s) + "/recurring",
        Map.of(
            "name",
            "Rent",
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            100_000,
            "frequency",
            "MONTHLY",
            "intervalN",
            1,
            "startOn",
            next.atDay(5).toString(),
            "autoPost",
            true),
        Map.class);
    post(
        s.token(),
        ws(s) + "/recurring",
        Map.of(
            "name",
            "Salary",
            "accountId",
            acc,
            "type",
            "INCOME",
            "amountMinor",
            500_000,
            "frequency",
            "MONTHLY",
            "intervalN",
            1,
            "startOn",
            next.atDay(1).toString(),
            "autoPost",
            true),
        Map.class);

    // six completed months of variable dining spend
    LocalDate firstOfThis = YearMonth.now().atDay(1);
    for (int k = 1; k <= 6; k++)
      spend(s, acc, 30_000 + 1_000L * k, firstOfThis.minusMonths(k).plusDays(9), food, null);

    // a subscription-like payee charged monthly for the same amount
    String netflix =
        (String)
            post(s.token(), ws(s) + "/payees", Map.of("name", "Streamflix"), Map.class).get("id");
    for (int k = 1; k <= 4; k++)
      spend(s, acc, 1_599, firstOfThis.minusMonths(k).plusDays(14), food, netflix);

    // transport: many small trips and one big outlier in the last 60 days
    LocalDate today = LocalDate.now();
    for (int d = 1; d <= 10; d++) spend(s, acc, 1_000, today.minusDays(d), transport, null);
    spend(s, acc, 20_000, today.minusDays(5), transport, null);

    Map<?, ?> f = get(s.token(), ws(s) + "/forecast", Map.class);
    assertEquals(next.toString(), f.get("month"));
    Map<?, ?> expense = (Map<?, ?>) f.get("expense");
    Map<?, ?> income = (Map<?, ?>) f.get("income");
    assertEquals(100_000, ((Number) expense.get("fixedMinor")).intValue());
    assertEquals(500_000, ((Number) income.get("fixedMinor")).intValue());
    assertEquals(1, ((List<?>) f.get("fixedExpenses")).size());
    long variable = ((Number) expense.get("variableMinor")).longValue();
    assertTrue(variable > 25_000 && variable < 90_000, "variable forecast was " + variable);
    assertEquals(
        ((Number) income.get("totalMinor")).longValue()
            - ((Number) expense.get("totalMinor")).longValue(),
        ((Number) f.get("netMinor")).longValue());
    assertTrue(
        ((List<?>) f.get("categories"))
            .stream().anyMatch(c -> "Food".equals(((Map<?, ?>) c).get("name"))));
    assertEquals("MEDIUM", f.get("confidence"));

    Map<?, ?> in = get(s.token(), ws(s) + "/insights", Map.class);
    assertEquals(7, ((List<?>) in.get("weekdays")).size());
    assertFalse(((List<?>) in.get("highlights")).isEmpty());
    assertTrue(
        ((List<?>) in.get("subscriptions"))
            .stream().anyMatch(x -> "Streamflix".equals(((Map<?, ?>) x).get("payee"))),
        "expected the monthly Streamflix charge to be detected: " + in.get("subscriptions"));
    assertTrue(
        ((List<?>) in.get("anomalies"))
            .stream()
                .anyMatch(x -> ((Number) ((Map<?, ?>) x).get("amountMinor")).intValue() == 20_000),
        "expected the 200.00 transport outlier: " + in.get("anomalies"));
  }

  @Test
  void aBrandNewWorkspaceForecastsZeroWithoutErrors() {
    Session s = register("fz");
    Map<?, ?> f = get(s.token(), ws(s) + "/forecast", Map.class);
    assertEquals(0, ((Number) ((Map<?, ?>) f.get("expense")).get("totalMinor")).intValue());
    assertEquals(0, ((Number) f.get("monthsOfHistory")).intValue());
    get(s.token(), ws(s) + "/insights", Map.class);
  }
}

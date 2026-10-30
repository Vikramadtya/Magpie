package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.recurring.RecurringService;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.MediaType;
import io.micronaut.http.client.multipart.MultipartBody;
import jakarta.inject.Inject;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PlanningAndInsightsTest extends ApiTestBase {

  @Inject RecurringService recurring;

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String account(Session s, long opening) {
    return (String)
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
                    opening),
                Map.class)
            .get("id");
  }

  private String expenseCategory(Session s) {
    return (String)
        getList(s.token(), ws(s) + "/categories").stream()
            .filter(c -> "EXPENSE".equals(c.get("kind")) && c.get("parentId") == null)
            .findFirst()
            .orElseThrow()
            .get("id");
  }

  @Test
  void budgetTracksSpendAndRollsOver() {
    Session s = register("bud");
    String acc = account(s, 0);
    String cat = expenseCategory(s);
    YearMonth month = YearMonth.now();
    http()
        .exchange(
            HttpRequest.PUT(
                    ws(s) + "/budgets/" + cat + "/" + month,
                    Map.of("amountMinor", 50_000, "rollover", true))
                .bearerAuth(s.token()));
    post(
        s.token(),
        ws(s) + "/transactions",
        Map.of(
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            12_000,
            "occurredOn",
            month.atDay(1).toString(),
            "categoryId",
            cat),
        Map.class);
    Map<?, ?> summary = get(s.token(), ws(s) + "/budgets?month=" + month, Map.class);
    Map<?, ?> line = (Map<?, ?>) ((List<?>) summary.get("lines")).get(0);
    assertEquals(12_000, ((Number) line.get("spentMinor")).intValue());
    assertEquals(38_000, ((Number) line.get("remainingMinor")).intValue());

    // next month: copy forward, unspent 38_000 rolls over
    YearMonth next = month.plusMonths(1);
    post(s.token(), ws(s) + "/budgets/copy-previous?month=" + next, Map.of(), Map.class);
    Map<?, ?> nextSummary = get(s.token(), ws(s) + "/budgets?month=" + next, Map.class);
    Map<?, ?> nextLine = (Map<?, ?>) ((List<?>) nextSummary.get("lines")).get(0);
    assertEquals(38_000, ((Number) nextLine.get("rolloverMinor")).intValue());
  }

  @Test
  void goalProgressAndContributions() {
    Session s = register("goal");
    Map<?, ?> goal =
        post(
            s.token(),
            ws(s) + "/goals",
            Map.of("name", "Trip", "targetMinor", 100_000, "currency", "USD"),
            Map.class);
    post(
        s.token(),
        ws(s) + "/goals/" + goal.get("id") + "/contributions",
        Map.of("amountMinor", 25_000, "occurredOn", LocalDate.now().toString()),
        Map.class);
    Map<?, ?> updated = getList(s.token(), ws(s) + "/goals").get(0);
    assertEquals(25, ((Number) updated.get("percent")).intValue());
  }

  @Test
  void recurringRulePostsOnceEvenIfTheJobRunsTwice() {
    Session s = register("rec");
    String acc = account(s, 100_000);
    LocalDate start = LocalDate.now().minusDays(1);
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
            40_000,
            "frequency",
            "MONTHLY",
            "intervalN",
            1,
            "startOn",
            start.toString(),
            "autoPost",
            true),
        Map.class);
    int first = recurring.postDue(LocalDate.now());
    int second = recurring.postDue(LocalDate.now());
    assertTrue(first >= 1, "the due rule should have been posted");
    assertEquals(0, second, "a second run must not post again");
    Map<?, ?> txs = get(s.token(), ws(s) + "/transactions", Map.class);
    assertEquals(1, ((List<?>) txs.get("items")).size());
    assertEquals(
        60_000,
        ((Number) get(s.token(), ws(s) + "/accounts/" + acc, Map.class).get("balanceMinor"))
            .intValue());
    // the next occurrence is a month later, so it shows up in the 40-day outlook
    assertEquals(1, getList(s.token(), ws(s) + "/recurring/upcoming?days=40").size());
  }

  @Test
  void dashboardAndAnalyticsAgree() {
    Session s = register("dash");
    String acc = account(s, 10_000);
    String cat = expenseCategory(s);
    String today = LocalDate.now().toString();
    post(
        s.token(),
        ws(s) + "/transactions",
        Map.of(
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            2_000,
            "occurredOn",
            today,
            "categoryId",
            cat),
        Map.class);
    post(
        s.token(),
        ws(s) + "/transactions",
        Map.of("accountId", acc, "type", "INCOME", "amountMinor", 8_000, "occurredOn", today),
        Map.class);

    Map<?, ?> dash = get(s.token(), ws(s) + "/dashboard", Map.class);
    assertEquals(16_000, ((Number) dash.get("netWorthMinor")).intValue());
    assertEquals(8_000, ((Number) dash.get("incomeMinor")).intValue());
    assertEquals(2_000, ((Number) dash.get("expenseMinor")).intValue());
    assertEquals(75, ((Number) dash.get("savingsRatePercent")).intValue());

    Map<?, ?> spending = get(s.token(), ws(s) + "/analytics/spending-by-category", Map.class);
    assertEquals(
        2_000,
        ((Number) ((Map<?, ?>) ((List<?>) spending.get("items")).get(0)).get("totalMinor"))
            .intValue());
    Map<?, ?> worth = get(s.token(), ws(s) + "/analytics/net-worth?months=3", Map.class);
    List<?> points = (List<?>) worth.get("items");
    assertEquals(3, points.size());
    assertEquals(16_000, ((Number) ((Map<?, ?>) points.get(2)).get("netWorthMinor")).intValue());
    assertTrue(
        ((List<?>) get(s.token(), ws(s) + "/analytics/cash-flow", Map.class).get("items")).size()
            >= 12);
  }

  @Test
  void csvImportDedupesAndCanBeUndone() {
    Session s = register("imp");
    String acc = account(s, 0);
    String csv =
        "Date,Amount,Description\n2026-02-01,-12.50,Coffee\n2026-02-02,2000.00,\"Salary, Feb\"\nnot-a-date,5,bad\n";
    MultipartBody body =
        MultipartBody.builder()
            .addPart("file", "bank.csv", MediaType.TEXT_CSV_TYPE, csv.getBytes())
            .addPart("accountId", acc)
            .build();
    Map<?, ?> preview =
        http()
            .retrieve(
                HttpRequest.POST(ws(s) + "/imports/preview", body)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .bearerAuth(s.token()),
                Map.class);
    List<?> rows = (List<?>) preview.get("rows");
    assertEquals(2, rows.size());
    assertEquals(1, ((Number) preview.get("skipped")).intValue());

    Map<String, Object> commit = Map.of("accountId", acc, "fileName", "bank.csv", "rows", rows);
    Map<?, ?> first = post(s.token(), ws(s) + "/imports/commit", commit, Map.class);
    assertEquals(2, ((Number) first.get("imported")).intValue());
    assertEquals(
        198_750,
        ((Number) get(s.token(), ws(s) + "/accounts/" + acc, Map.class).get("balanceMinor"))
            .intValue());

    Map<?, ?> again = post(s.token(), ws(s) + "/imports/commit", commit, Map.class);
    assertEquals(0, ((Number) again.get("imported")).intValue());
    assertEquals(2, ((Number) again.get("duplicates")).intValue());

    http()
        .exchange(
            HttpRequest.DELETE(ws(s) + "/imports/" + first.get("batchId")).bearerAuth(s.token()));
    assertEquals(
        0,
        ((Number) get(s.token(), ws(s) + "/accounts/" + acc, Map.class).get("balanceMinor"))
            .intValue());

    String exported =
        http()
            .retrieve(
                HttpRequest.GET(ws(s) + "/export/transactions.csv").bearerAuth(s.token()),
                String.class);
    assertTrue(exported.startsWith("date,type,account"));
  }

  @Test
  void investmentSummaryComputesGain() {
    Session s = register("inv");
    post(
        s.token(),
        ws(s) + "/holdings",
        Map.of(
            "symbol",
            "VTI",
            "name",
            "Total Market",
            "quantity",
            10,
            "costBasisMinor",
            200_000,
            "priceMinor",
            25_000,
            "currency",
            "USD"),
        Map.class);
    Map<?, ?> summary = get(s.token(), ws(s) + "/investments/summary", Map.class);
    assertEquals(250_000, ((Number) summary.get("valueMinor")).intValue());
    assertEquals(50_000, ((Number) summary.get("gainMinor")).intValue());
    assertEquals(25, ((Number) summary.get("gainPercent")).intValue());
  }
}

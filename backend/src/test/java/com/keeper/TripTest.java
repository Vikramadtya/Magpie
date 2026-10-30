package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TripTest extends ApiTestBase {

  @Inject Db db;
  @Inject FxConverter fx;

  @BeforeEach
  void rates() {
    db.update("DELETE FROM exchange_rates");
    db.update(
        "INSERT INTO exchange_rates(base, quote, rate, as_of) VALUES ('USD','EUR',?,?)",
        new BigDecimal("0.90"),
        LocalDate.now());
    fx.invalidate();
  }

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String account(Session s, String currency) {
    return (String)
        post(
                s.token(),
                ws(s) + "/accounts",
                Map.of(
                    "name",
                    currency + " acct",
                    "type",
                    "CHECKING",
                    "currency",
                    currency,
                    "openingBalanceMinor",
                    1_000_000),
                Map.class)
            .get("id");
  }

  private Map<?, ?> spend(Session s, String acc, long amount, LocalDate date, String category) {
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
                date.toString()));
    if (category != null) body.put("categoryId", category);
    return post(s.token(), ws(s) + "/transactions", body, Map.class);
  }

  private long num(Object o) {
    return ((Number) o).longValue();
  }

  @Test
  void aTripShowsWhatItReallyCostInYourMainCurrency() {
    Session s = register("trip");
    String usd = account(s, "USD");
    String eur = account(s, "EUR");
    LocalDate today = LocalDate.now();
    String food =
        (String)
            getList(s.token(), ws(s) + "/categories").stream()
                .filter(c -> "Food".equals(c.get("name")))
                .findFirst()
                .orElseThrow()
                .get("id");

    // ordinary life before the trip: 90.00 spread over the 90 days before it starts
    spend(s, usd, 9_000, today.minusDays(20), null);

    Map<?, ?> trip =
        post(
            s.token(),
            ws(s) + "/trips",
            Map.of(
                "name",
                "Lisbon",
                "startDate",
                today.minusDays(2).toString(),
                "endDate",
                today.plusDays(3).toString(),
                "budgetMinor",
                100_000),
            Map.class);
    String id = (String) trip.get("id");
    assertEquals("ONGOING", trip.get("status"));
    assertEquals(6, num(trip.get("totalDays")));

    spend(s, eur, 4_500, today.minusDays(1), food); // 45.00 EUR = 50.00 USD at 0.90
    spend(s, usd, 3_000, today, food); // 30.00 USD
    Map<?, ?> outside = spend(s, usd, 2_000, today.minusDays(10), null); // before the trip
    // a loan during the trip is not trip spending
    post(
        s.token(),
        ws(s) + "/loans",
        Map.of(
            "person",
            "Sam",
            "direction",
            "LENT",
            "accountId",
            usd,
            "amountMinor",
            7_000,
            "occurredOn",
            today.toString()),
        Map.class);

    // one click attaches everything dated within the trip
    Map<?, ?> d0 = get(s.token(), ws(s) + "/trips/" + id, Map.class);
    assertEquals(2, num(d0.get("unassignedInRange")));
    assertEquals(
        2,
        num(
            post(s.token(), ws(s) + "/trips/" + id + "/assign-range", Map.of(), Map.class)
                .get("affected")));
    // and individual expenses can be added by hand
    assertEquals(
        1,
        num(
            post(
                    s.token(),
                    ws(s) + "/trips/" + id + "/assign",
                    Map.of("ids", List.of(outside.get("id"))),
                    Map.class)
                .get("affected")));

    Map<?, ?> d = get(s.token(), ws(s) + "/trips/" + id, Map.class);
    Map<?, ?> t = (Map<?, ?>) d.get("trip");
    assertEquals(10_000, num(t.get("spentMinor"))); // 50 + 30 + 20, the loan excluded
    assertEquals(3, num(t.get("expenseCount")));
    assertEquals(90_000, num(d.get("budgetRemainingMinor")));
    assertEquals(100, num(d.get("normalDailyMinor"))); // 90.00 over 90 days = 1.00/day
    assertEquals(0, num(d.get("unassignedInRange")));
    assertTrue(num(d.get("projectedMinor")) >= 10_000);

    // by currency: what was paid locally versus what it was worth at home
    Map<?, ?> eurRow =
        ((List<?>) d.get("currencies"))
            .stream()
                .map(c -> (Map<?, ?>) c)
                .filter(c -> "EUR".equals(c.get("currency")))
                .findFirst()
                .orElseThrow();
    assertEquals(4_500, num(eurRow.get("localMinor")));
    assertEquals(5_000, num(eurRow.get("baseMinor")));
    assertEquals(5_000, num(((Map<?, ?>) ((List<?>) d.get("largest")).get(0)).get("baseMinor")));
    assertEquals(3, ((List<?>) d.get("days")).size());
    assertEquals("Food", ((Map<?, ?>) ((List<?>) d.get("categories")).get(0)).get("name"));

    // the transaction list can show just the trip, and rows carry the trip name
    Map<?, ?> list = get(s.token(), ws(s) + "/transactions?tripId=" + id, Map.class);
    assertEquals(3, ((List<?>) list.get("items")).size());
    assertEquals("Lisbon", ((Map<?, ?>) ((List<?>) list.get("items")).get(0)).get("tripName"));

    // clearing detaches the expenses without deleting them
    post(s.token(), ws(s) + "/trips/" + id + "/clear", Map.of(), Map.class);
    assertEquals(
        0,
        num(
            ((Map<?, ?>) get(s.token(), ws(s) + "/trips/" + id, Map.class).get("trip"))
                .get("spentMinor")));
    assertEquals(
        HttpStatus.OK,
        statusOf(
            HttpRequest.GET(ws(s) + "/transactions/" + outside.get("id")).bearerAuth(s.token())));

    // deleting the trip keeps the expenses too
    post(
        s.token(),
        ws(s) + "/trips/" + id + "/assign",
        Map.of("ids", List.of(outside.get("id"))),
        Map.class);
    http().exchange(HttpRequest.DELETE(ws(s) + "/trips/" + id).bearerAuth(s.token()));
    assertNull(
        ((Map<?, ?>) get(s.token(), ws(s) + "/transactions/" + outside.get("id"), Map.class))
            .get("tripId"));
  }

  @Test
  void aTripBelongsToOneLedgerOnly() {
    Session mine = register("tm");
    Session other = register("to");
    String trip =
        (String)
            post(
                    other.token(),
                    ws(other) + "/trips",
                    Map.of(
                        "name",
                        "Theirs",
                        "startDate",
                        LocalDate.now().toString(),
                        "endDate",
                        LocalDate.now().toString()),
                    Map.class)
                .get("id");
    assertEquals(
        HttpStatus.NOT_FOUND,
        statusOf(HttpRequest.GET(ws(other) + "/trips").bearerAuth(mine.token())));
    // my ledger does not know their trip id
    assertEquals(
        HttpStatus.NOT_FOUND,
        statusOf(HttpRequest.GET(ws(mine) + "/trips/" + trip).bearerAuth(mine.token())));
    // and a trip cannot end before it starts
    assertEquals(
        HttpStatus.BAD_REQUEST,
        statusOf(
            HttpRequest.POST(
                    ws(mine) + "/trips",
                    Map.of("name", "Backwards", "startDate", "2026-03-10", "endDate", "2026-03-01"))
                .bearerAuth(mine.token())));
  }
}

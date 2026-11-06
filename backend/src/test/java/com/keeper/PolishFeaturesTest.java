package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PolishFeaturesTest extends ApiTestBase {

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

  private String category(Session s, String name) {
    return (String)
        post(s.token(), ws(s) + "/categories", Map.of("name", name, "kind", "EXPENSE"), Map.class)
            .get("id");
  }

  private String payee(Session s, String name) {
    return (String) post(s.token(), ws(s) + "/payees", Map.of("name", name), Map.class).get("id");
  }

  private Map<String, Object> spend(Session s, String acc, String cat, String payee, int minor) {
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
                LocalDate.now().toString()));
    if (cat != null) body.put("categoryId", cat);
    if (payee != null) body.put("payeeId", payee);
    @SuppressWarnings("unchecked")
    Map<String, Object> created = post(s.token(), ws(s) + "/transactions", body, Map.class);
    return created;
  }

  private long number(Map<?, ?> m, String key) {
    return ((Number) m.get(key)).longValue();
  }

  @Test
  void safeToSpendIsWhatIsHeldLessWhatIsSpokenFor() {
    Session s = register("safe");
    account(s, "Bank", "CHECKING", 100_000);
    account(s, "Cash", "CASH", 20_000);
    account(s, "Card", "CREDIT_CARD", -30_000);
    account(s, "Broker", "INVESTMENT", 900_000); // not spendable
    String goal =
        (String)
            post(
                    s.token(),
                    ws(s) + "/goals",
                    Map.of("name", "Trip", "targetMinor", 90_000, "currency", "USD"),
                    Map.class)
                .get("id");
    post(
        s.token(),
        ws(s) + "/goals/" + goal + "/contributions",
        Map.of("amountMinor", 25_000, "occurredOn", LocalDate.now().toString()),
        Map.class);

    Map<?, ?> safe = (Map<?, ?>) get(s.token(), ws(s) + "/dashboard", Map.class).get("safe");
    assertEquals(100_000 + 20_000 - 30_000 - 25_000, number(safe, "totalMinor"));
    long sum = 0;
    for (Object l : (List<?>) safe.get("lines")) sum += number((Map<?, ?>) l, "minor");
    assertEquals(number(safe, "totalMinor"), sum); // the lines add up
    assertTrue(number(safe, "daysLeft") >= 1);
  }

  @Test
  void aPayeeLearnsItsCategoryAndPastEntriesCanBeCategorisedFromIt() {
    Session s = register("rules");
    String acc = account(s, "Bank", "CHECKING", 100_000);
    String food = category(s, "Food Rule");
    String swiggy = payee(s, "Swiggy Rule");

    spend(s, acc, null, swiggy, 500); // nothing to learn from yet
    Map<?, ?> first = spend(s, acc, food, swiggy, 700); // you filed it under Food: learned
    assertEquals(food, first.get("categoryId"));
    List<Map<String, Object>> payees = getList(s.token(), ws(s) + "/payees");
    assertEquals(
        food,
        payees.stream()
            .filter(p -> swiggy.equals(p.get("id")))
            .findFirst()
            .orElseThrow()
            .get("defaultCategoryId"));

    Map<?, ?> later = spend(s, acc, null, swiggy, 900); // applied automatically
    assertEquals(food, later.get("categoryId"));

    Map<?, ?> applied = post(s.token(), ws(s) + "/payees/apply-defaults", Map.of(), Map.class);
    assertEquals(1, number(applied, "updated")); // the very first, uncategorised one
  }

  @Test
  void sampleDataFillsAnEmptyLedgerAndCanBeRemoved() {
    Session s = register("sample");
    Map<?, ?> loaded = post(s.token(), ws(s) + "/sample-data", Map.of(), Map.class);
    assertEquals(3, number(loaded, "accounts"));
    assertTrue(number(loaded, "transactions") > 10);
    assertEquals(3, getList(s.token(), ws(s) + "/accounts").size());

    var again = HttpRequest.POST(ws(s) + "/sample-data", Map.of()).bearerAuth(s.token());
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, statusOf(again));

    http().exchange(HttpRequest.DELETE(ws(s) + "/sample-data").bearerAuth(s.token()));
    assertEquals(0, getList(s.token(), ws(s) + "/accounts").size());
  }

  @Test
  void theDigestWebhookIsValidatedAndNeverReturned() {
    Session s = register("digest");
    Map<?, ?> none = get(s.token(), ws(s) + "/digest", Map.class);
    assertEquals(false, none.get("configured"));

    var bad =
        HttpRequest.PUT(
                ws(s) + "/digest",
                Map.of("webhookUrl", "https://evil.example/hook", "enabled", true))
            .bearerAuth(s.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(bad));

    Map<?, ?> saved =
        put(
            s.token(),
            ws(s) + "/digest",
            Map.of("webhookUrl", "https://discord.com/api/webhooks/123/abc", "enabled", true),
            Map.class);
    assertEquals(true, saved.get("configured"));
    assertEquals(true, saved.get("enabled"));
    assertFalse(saved.toString().contains("abc")); // the link itself is not sent back
    assertNull(saved.get("webhookUrl"));

    Map<?, ?> off = put(s.token(), ws(s) + "/digest", Map.of("enabled", false), Map.class);
    assertEquals(true, off.get("configured")); // keeping the link when only the switch changes
    assertEquals(false, off.get("enabled"));
  }

  @Test
  void aSumOfMoneyBuysAFractionOfAShare() {
    Session s = register("fraction");
    // $50 at $188.37 a share is 0.26543504 of a share
    Map<?, ?> h =
        post(
            s.token(),
            ws(s) + "/holdings",
            Map.of(
                "symbol",
                "ZZFRAC",
                "name",
                "Fractional",
                "quantity",
                0.26543504,
                "unitPriceMinor",
                18_837,
                "priceMinor",
                20_000,
                "currency",
                "USD"),
            Map.class);
    assertEquals(5_000, number(h, "costBasisMinor"));
    assertEquals(0.26543504, ((Number) h.get("quantity")).doubleValue(), 1e-9);
    // market value is the fraction times today's price, to the cent
    assertEquals(5_309, number(h, "marketValueMinor"));
  }

  @Test
  void aHoldingHasAHistoryOfPriceValueAndPaidIn() {
    Session s = register("holding-history");
    Map<?, ?> h =
        post(
            s.token(),
            ws(s) + "/holdings",
            Map.of(
                "symbol",
                "ZZHIST",
                "name",
                "History",
                "quantity",
                4,
                "unitPriceMinor",
                1_000,
                "priceMinor",
                1_500,
                "currency",
                "USD",
                "purchasedOn",
                LocalDate.now().minusDays(30).toString()),
            Map.class);
    Map<?, ?> history = get(s.token(), ws(s) + "/holdings/" + h.get("id") + "/history", Map.class);
    assertEquals("USD", history.get("currency"));
    List<?> prices = (List<?>) history.get("prices");
    List<?> value = (List<?>) history.get("value");
    List<?> invested = (List<?>) history.get("invested");
    assertFalse(prices.isEmpty());
    // the last point is today: 4 units at 15.00, with 40.00 paid in
    assertEquals(1_500, number((Map<?, ?>) prices.get(prices.size() - 1), "minor"));
    assertEquals(6_000, number((Map<?, ?>) value.get(value.size() - 1), "minor"));
    assertEquals(4_000, number((Map<?, ?>) invested.get(invested.size() - 1), "minor"));
  }
}

package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;

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

/**
 * Conversion goes through one service; entering a transaction in another currency converts once.
 */
class CrossCurrencyTest extends ApiTestBase {

  @Inject Db db;
  @Inject FxConverter fx;

  @BeforeEach
  void seedRates() {
    // 1 USD = 0.90 EUR = 150 JPY
    for (var e : Map.of("EUR", "0.90", "JPY", "150").entrySet()) {
      db.update(
          "INSERT INTO exchange_rates(base, quote, rate, as_of) VALUES ('USD', ?, ?, ?) "
              + "ON CONFLICT (base, quote, as_of) DO UPDATE SET rate = EXCLUDED.rate",
          e.getKey(),
          new BigDecimal(e.getValue()),
          LocalDate.now());
    }
    fx.invalidate();
  }

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String account(Session s, String currency, long opening) {
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
                    opening),
                Map.class)
            .get("id");
  }

  private long balance(Session s, String id) {
    return ((Number) get(s.token(), ws(s) + "/accounts/" + id, Map.class).get("balanceMinor"))
        .longValue();
  }

  @Test
  void emptyRateTableMeansNoRatesNotACrash() {
    db.update("DELETE FROM exchange_rates");
    fx.invalidate();
    assertEquals(false, fx.convert(100, "USD", "EUR").isPresent());
    assertEquals(100, fx.convert(100, "USD", "USD").getAsLong());
  }

  @Test
  void anyPairIsDerivedFromThePivot() {
    // EUR -> JPY: 0.90 EUR = 1 USD = 150 JPY, so 1 EUR = 166.666... JPY
    long jpy = fx.convert(9_000, "EUR", "JPY").getAsLong();
    assertEquals(15_000, jpy);
    assertEquals(false, fx.convert(100, "XYZ", "USD").isPresent());
  }

  @Test
  void quoteEndpointUsesTheSameRates() {
    Session s = register("q");
    Map<?, ?> q = get(s.token(), "/api/v1/fx/convert?from=USD&to=EUR&amountMinor=10000", Map.class);
    assertEquals(9_000, ((Number) q.get("convertedMinor")).intValue());
    Map<?, ?> none =
        get(s.token(), "/api/v1/fx/convert?from=USD&to=XYZ&amountMinor=100", Map.class);
    assertEquals(false, none.get("available"));
  }

  @Test
  void transactionInAnotherCurrencyIsConvertedIntoTheAccount() {
    Session s = register("xc");
    String eur = account(s, "EUR", 100_000);
    Map<?, ?> tx =
        post(
            s.token(),
            ws(s) + "/transactions",
            Map.of(
                "accountId",
                eur,
                "type",
                "EXPENSE",
                "amountMinor",
                10_000,
                "currency",
                "USD",
                "occurredOn",
                "2026-03-01"),
            Map.class);
    assertEquals(9_000, ((Number) tx.get("amountMinor")).intValue());
    assertEquals("EUR", tx.get("currency"));
    assertEquals(10_000, ((Number) tx.get("origAmountMinor")).intValue());
    assertEquals("USD", tx.get("origCurrency"));
    assertEquals(91_000, balance(s, eur));
  }

  @Test
  void explicitAccountAmountOverridesTheRate() {
    Session s = register("ov");
    String eur = account(s, "EUR", 0);
    Map<?, ?> tx =
        post(
            s.token(),
            ws(s) + "/transactions",
            Map.of(
                "accountId",
                eur,
                "type",
                "INCOME",
                "amountMinor",
                10_000,
                "currency",
                "USD",
                "accountAmountMinor",
                9_321,
                "occurredOn",
                "2026-03-01"),
            Map.class);
    assertEquals(9_321, ((Number) tx.get("amountMinor")).intValue());
    assertEquals(9_321, balance(s, eur));
  }

  @Test
  void unknownRateIsRejectedInsteadOfGuessed() {
    Session s = register("nr");
    String usd = account(s, "USD", 0);
    var req =
        HttpRequest.POST(
                ws(s) + "/transactions",
                Map.of(
                    "accountId",
                    usd,
                    "type",
                    "EXPENSE",
                    "amountMinor",
                    100,
                    "currency",
                    "XYZ",
                    "occurredOn",
                    "2026-03-01"))
            .bearerAuth(s.token());
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, statusOf(req));
    assertEquals(0, balance(s, usd));
  }

  @Test
  void reportsConvertMixedAccountsIntoTheBaseCurrencyAndFlagGaps() {
    Session s = register("rep");
    account(s, "USD", 10_000);
    account(s, "EUR", 9_000); // 90.00 EUR = 100.00 USD
    Map<?, ?> dash = get(s.token(), ws(s) + "/dashboard", Map.class);
    assertEquals(20_000, ((Number) dash.get("netWorthMinor")).intValue());
    assertEquals(List.of(), dash.get("missingCurrencies"));
  }
}

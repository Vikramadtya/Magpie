package com.keeper.market;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.investment.HoldingRefresher;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class AutoLinkTest {

  private static MarketDataProvider provider(Map<String, Quote> quotes) {
    return new MarketDataProvider() {
      public String name() {
        return "stub";
      }

      public List<SecurityHit> search(String query) {
        return List.of();
      }

      public Optional<Quote> quote(String symbol) {
        return Optional.ofNullable(quotes.get(symbol));
      }
    };
  }

  private static Quote quote(String symbol, String price, String currency) {
    return new Quote(symbol, symbol, new BigDecimal(price), currency, "X", Instant.now(), "stub");
  }

  private static HoldingRefresher refresher(Map<String, Quote> quotes) {
    var market = new MarketDataService(List.of(provider(quotes)), true);
    return new HoldingRefresher(null, market, null, null);
  }

  @Test
  void aTypedSymbolFindsItsLivePrice() {
    var r = refresher(Map.of("AAPL", quote("AAPL", "231.50", "USD")));
    var found = r.findLive("aapl", "USD");
    assertTrue(found.isPresent());
    assertEquals("AAPL", found.get().providerSymbol());
    assertEquals(23_150, found.get().minor());
  }

  @Test
  void indianSymbolsTryTheirExchangeSuffix() {
    var r = refresher(Map.of("TCS.NS", quote("TCS.NS", "3890.25", "INR")));
    var found = r.findLive("TCS", "INR");
    assertEquals("TCS.NS", found.orElseThrow().providerSymbol());
    assertEquals(389_025, found.get().minor());
  }

  @Test
  void aTickerThatMeansSomethingElseAbroadIsNotLinked() {
    // "TCS" quoted in USD must not be linked to a holding kept in rupees.
    var r = refresher(Map.of("TCS", quote("TCS", "12.00", "USD")));
    assertTrue(r.findLive("TCS", "INR").isEmpty());
  }

  @Test
  void unknownSymbolsStayManual() {
    assertTrue(refresher(Map.of()).findLive("NOPE", "USD").isEmpty());
  }
}

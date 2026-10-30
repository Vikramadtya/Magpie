package com.keeper.market;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class YahooParsingTest {

  @Test
  void searchKeepsOnlyRealInstrumentsAndTheirExactSymbols() {
    Map<String, Object> body =
        Map.of(
            "quotes",
            List.of(
                Map.of(
                    "symbol",
                    "RELIANCE.NS",
                    "longname",
                    "Reliance Industries Limited",
                    "exchDisp",
                    "NSE",
                    "quoteType",
                    "EQUITY"),
                Map.of(
                    "symbol",
                    "^NSEI",
                    "shortname",
                    "NIFTY 50",
                    "exchDisp",
                    "NSE",
                    "quoteType",
                    "INDEX"),
                Map.of(
                    "symbol",
                    "AAPL",
                    "shortname",
                    "Apple Inc.",
                    "exchDisp",
                    "NASDAQ",
                    "quoteType",
                    "EQUITY"),
                Map.of(
                    "symbol",
                    "RELIANCE-WARRANT",
                    "shortname",
                    "x",
                    "exchDisp",
                    "x",
                    "quoteType",
                    "OPTION")));
    List<SecurityHit> hits = YahooFinanceProvider.parseSearch(body);
    assertEquals(
        List.of("RELIANCE.NS", "^NSEI", "AAPL"), hits.stream().map(SecurityHit::symbol).toList());
    assertEquals("Reliance Industries Limited", hits.get(0).name());
    assertEquals("INDEX", hits.get(1).type());
  }

  private static Map<String, Object> chart(Map<String, Object> meta) {
    return Map.of("chart", Map.of("result", List.of(Map.of("meta", meta))));
  }

  @Test
  void indianStockQuoteIsInRupees() {
    var q =
        YahooFinanceProvider.parseChart(
                chart(
                    Map.of(
                        "symbol",
                        "RELIANCE.NS",
                        "currency",
                        "INR",
                        "regularMarketPrice",
                        2890.55,
                        "longName",
                        "Reliance Industries Limited",
                        "fullExchangeName",
                        "NSE",
                        "regularMarketTime",
                        1793000000)))
            .orElseThrow();
    assertEquals("INR", q.currency());
    assertEquals(0, new BigDecimal("2890.55").compareTo(q.price()));
    assertEquals("RELIANCE.NS", q.symbol());
  }

  @Test
  void londonPenceAreNormalisedToPounds() {
    var q =
        YahooFinanceProvider.parseChart(
                chart(
                    Map.of(
                        "symbol",
                        "VOD.L",
                        "currency",
                        "GBp",
                        "regularMarketPrice",
                        72.5,
                        "shortName",
                        "Vodafone")))
            .orElseThrow();
    assertEquals("GBP", q.currency());
    assertEquals(0, new BigDecimal("0.725").compareTo(q.price()));
  }

  @Test
  void errorOrEmptyResponsesGiveNoQuote() {
    assertTrue(
        YahooFinanceProvider.parseChart(Map.of("chart", Map.of("result", List.of()))).isEmpty());
    assertTrue(YahooFinanceProvider.parseChart(Map.of()).isEmpty());
    assertTrue(YahooFinanceProvider.parseChart(chart(Map.of("symbol", "X"))).isEmpty());
  }
}

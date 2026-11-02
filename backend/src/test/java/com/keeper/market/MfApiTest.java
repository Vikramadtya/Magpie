package com.keeper.market;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class MfApiTest {

  @Test
  void searchResultsBecomePrefixedFundSymbols() {
    var hits =
        MfApiProvider.parseSearch(
            List.of(Map.of("schemeCode", 122639, "schemeName", "Parag Parikh Flexi Cap - Direct")));
    assertEquals("MF:122639", hits.get(0).symbol());
    assertEquals("MUTUALFUND", hits.get(0).type());
    assertEquals("INR", hits.get(0).currency());
  }

  @Test
  void latestNavBecomesARupeeQuote() {
    var q =
        MfApiProvider.parseLatest(
            "MF:122639",
            Map.of(
                "meta", Map.of("scheme_name", "Parag Parikh Flexi Cap - Direct"),
                "data", List.of(Map.of("date", "30-10-2026", "nav", "89.23320"))));
    assertTrue(q.isPresent());
    assertEquals("89.23320", q.get().price().toPlainString());
    assertEquals("INR", q.get().currency());
  }

  @Test
  void emptyOrZeroNavIsNoQuote() {
    assertFalse(MfApiProvider.parseLatest("MF:1", Map.of("data", List.of())).isPresent());
    assertFalse(
        MfApiProvider.parseLatest("MF:1", Map.of("data", List.of(Map.of("nav", "0")))).isPresent());
  }

  @Test
  void onlyTheFundSourceHandlesFundSymbols() {
    var stocks = new YahooFinanceProvider(null, null);
    assertFalse(stocks.handles("MF:122639"));
    assertTrue(stocks.handles("TCS.NS"));
  }
}

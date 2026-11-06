package com.keeper.market;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class HistoryParsingTest {

  @Test
  void yahooChartBecomesMonthlyPricesAndSkipsGaps() {
    Map<String, Object> body =
        Map.of(
            "chart",
            Map.of(
                "result",
                List.of(
                    Map.of(
                        "meta", Map.of("currency", "USD"),
                        "timestamp", List.of(1767225600L, 1769904000L, 1772323200L),
                        "indicators",
                            Map.of(
                                "quote",
                                List.of(
                                    Map.of(
                                        "close",
                                        java.util.Arrays.asList(100.5, null, 120.25))))))));

    List<PricePoint> points = YahooFinanceProvider.parseHistory(body);

    assertEquals(2, points.size());
    assertEquals(LocalDate.parse("2026-01-01"), points.get(0).date());
    assertEquals(new BigDecimal("100.5"), points.get(0).price());
    assertEquals("USD", points.get(0).currency());
    assertEquals(new BigDecimal("120.25"), points.get(1).price());
  }

  @Test
  void londonPenceBecomePounds() {
    Map<String, Object> body =
        Map.of(
            "chart",
            Map.of(
                "result",
                List.of(
                    Map.of(
                        "meta", Map.of("currency", "GBp"),
                        "timestamp", List.of(1767225600L),
                        "indicators",
                            Map.of("quote", List.of(Map.of("close", List.of(1250.0))))))));
    List<PricePoint> points = YahooFinanceProvider.parseHistory(body);
    assertEquals(new BigDecimal("12.5"), points.get(0).price().stripTrailingZeros());
    assertEquals("GBP", points.get(0).currency());
  }

  @Test
  void fundNavListIsReadOldestFirst() {
    Map<String, Object> body =
        Map.of(
            "data",
            List.of(
                Map.of("date", "02-03-2026", "nav", "55.10"),
                Map.of("date", "bad", "nav", "1"),
                Map.of("date", "01-03-2026", "nav", "55.00")));
    List<PricePoint> points = MfApiProvider.parseHistory(body);
    assertEquals(2, points.size());
    assertEquals(LocalDate.parse("2026-03-01"), points.get(0).date());
    assertEquals(new BigDecimal("55.10"), points.get(1).price());
    assertEquals("INR", points.get(0).currency());
  }
}

package com.keeper.investment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.market.PricePoint;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class HistoryBackfillTest {
  private static PricePoint p(String date, String price) {
    return new PricePoint(LocalDate.parse(date), new BigDecimal(price), "USD");
  }

  @Test
  void monthEndValueIsUnitsHeldThenTimesTheLatestPrice() {
    var buys =
        List.of(
            new HistoryBackfill.Buy(LocalDate.parse("2026-01-15"), new BigDecimal("2")),
            new HistoryBackfill.Buy(LocalDate.parse("2026-03-10"), new BigDecimal("1.5")));
    var prices =
        List.of(
            p("2026-01-30", "100"),
            p("2026-02-27", "110"),
            p("2026-03-31", "120"),
            p("2026-04-30", "130"));

    var values = HistoryBackfill.monthEndValues(buys, prices, LocalDate.parse("2026-05-10"));

    // January to April, one per month-end; the current month is left to live tracking
    assertEquals(4, values.size());
    assertEquals(LocalDate.parse("2026-01-31"), values.get(0).asOf());
    assertEquals(new BigDecimal("2"), values.get(0).quantity()); // before the March buy
    assertEquals(new BigDecimal("100"), values.get(0).price());
    assertEquals(new BigDecimal("3.5"), values.get(2).quantity()); // both buys held by March
    assertEquals(new BigDecimal("120"), values.get(2).price());
  }

  @Test
  void nothingIsInventedBeforeTheFirstBuyOrWithoutPrices() {
    var buys = List.of(new HistoryBackfill.Buy(LocalDate.parse("2026-03-10"), BigDecimal.ONE));
    assertTrue(
        HistoryBackfill.monthEndValues(buys, List.of(), LocalDate.parse("2026-05-10")).isEmpty());
    var values =
        HistoryBackfill.monthEndValues(
            buys,
            List.of(p("2025-12-31", "90"), p("2026-03-31", "120")),
            LocalDate.parse("2026-05-10"));
    assertEquals(
        List.of(LocalDate.parse("2026-03-31")),
        values.stream().map(HistoryBackfill.Value::asOf).toList().subList(0, 1));
  }

  @Test
  void aStalePriceIsNotCarriedForwardForever() {
    var buys = List.of(new HistoryBackfill.Buy(LocalDate.parse("2026-01-05"), BigDecimal.ONE));
    // the only price is from months earlier than the month-ends it would be applied to
    var values =
        HistoryBackfill.monthEndValues(
            buys, List.of(p("2025-09-30", "50")), LocalDate.parse("2026-04-10"));
    assertTrue(values.isEmpty());
  }

  @Test
  void yearsOfDailyPricesBecomeOneLastPricePerWeek() {
    var daily = new java.util.ArrayList<PricePoint>();
    LocalDate d = LocalDate.parse("2024-01-01");
    for (int i = 0; i < 800; i++)
      daily.add(new PricePoint(d.plusDays(i), BigDecimal.valueOf(i + 1), "INR"));

    var weekly = HistoryBackfill.weekly(daily);

    assertTrue(weekly.size() < 130 && weekly.size() > 100);
    assertEquals(daily.get(799), weekly.get(weekly.size() - 1)); // the newest price is kept
    // a short history is left alone
    assertEquals(3, HistoryBackfill.weekly(daily.subList(0, 3)).size());
  }
}

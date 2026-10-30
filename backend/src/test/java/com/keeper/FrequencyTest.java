package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.keeper.fx.CurrencyUnits;
import com.keeper.recurring.Frequency;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class FrequencyTest {

  @Test
  void monthlyOnThe31stDoesNotDriftToThe28th() {
    LocalDate d = LocalDate.of(2026, 1, 31);
    d = Frequency.MONTHLY.next(d, 1, 31);
    assertEquals(LocalDate.of(2026, 2, 28), d);
    d = Frequency.MONTHLY.next(d, 1, 31);
    assertEquals(LocalDate.of(2026, 3, 31), d);
    d = Frequency.MONTHLY.next(d, 1, 31);
    assertEquals(LocalDate.of(2026, 4, 30), d);
  }

  @Test
  void yearlyOnLeapDayFallsBackThenReturns() {
    LocalDate d = Frequency.YEARLY.next(LocalDate.of(2028, 2, 29), 1, 29);
    assertEquals(LocalDate.of(2029, 2, 28), d);
    assertEquals(
        LocalDate.of(2032, 2, 29), Frequency.YEARLY.next(LocalDate.of(2031, 2, 28), 1, 29));
  }

  @Test
  void quarterlyWeeklyDaily() {
    assertEquals(
        LocalDate.of(2026, 4, 15), Frequency.QUARTERLY.next(LocalDate.of(2026, 1, 15), 1, 15));
    assertEquals(
        LocalDate.of(2026, 1, 22), Frequency.WEEKLY.next(LocalDate.of(2026, 1, 15), 1, 15));
    assertEquals(LocalDate.of(2026, 1, 17), Frequency.DAILY.next(LocalDate.of(2026, 1, 15), 2, 15));
  }

  @Test
  void currencyConversionRespectsMinorUnits() {
    // 100.00 USD at 150 JPY per USD = 15000 JPY (JPY has no minor units)
    assertEquals(15_000, CurrencyUnits.convert(10_000, "USD", "JPY", BigDecimal.valueOf(150)));
    // and back: 15000 JPY at 1/150 USD per JPY = 100.00 USD
    assertEquals(
        10_000,
        CurrencyUnits.convert(
            15_000,
            "JPY",
            "USD",
            BigDecimal.ONE.divide(BigDecimal.valueOf(150), 12, RoundingMode.HALF_UP)));
    assertEquals(500, CurrencyUnits.convert(500, "USD", "USD", BigDecimal.ONE));
  }
}

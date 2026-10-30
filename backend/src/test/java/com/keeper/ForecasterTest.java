package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.forecast.Forecaster;
import org.junit.jupiter.api.Test;

class ForecasterTest {

  @Test
  void constantSeriesForecastsTheConstantWithATightInterval() {
    var r = Forecaster.forecast(new double[] {500, 500, 500, 500, 500, 500, 500, 500, 500, 500});
    assertEquals(500, r.value(), 1);
    assertTrue(r.high() - r.low() < 5);
    assertEquals("HIGH", r.confidence());
  }

  @Test
  void aRisingSeriesForecastsAboveTheRecentAverage() {
    var r = Forecaster.forecast(new double[] {100, 120, 140, 160, 180, 200, 220, 240, 260, 280});
    assertTrue(r.value() > 250, "expected an upward projection but was " + r.value());
    assertTrue(r.low() <= r.value() && r.value() <= r.high());
  }

  @Test
  void aSingleSpikeDoesNotDominateTheForecast() {
    var r = Forecaster.forecast(new double[] {300, 310, 290, 305, 295, 2000, 300, 310, 295, 305});
    assertTrue(r.value() < 700, "spike leaked into forecast: " + r.value());
  }

  @Test
  void shortHistoryIsFlaggedLowConfidence() {
    var r = Forecaster.forecast(new double[] {400, 600});
    assertEquals("LOW", r.confidence());
    assertEquals(500, r.value(), 0.01);
    assertEquals("NONE", Forecaster.forecast(new double[] {}).confidence());
  }

  @Test
  void neverForecastsNegativeSpending() {
    var r = Forecaster.forecast(new double[] {900, 700, 500, 300, 100, 0, 0, 0});
    assertTrue(r.value() >= 0 && r.low() >= 0);
  }

  @Test
  void sameMonthLastYearIsUsedWithEnoughHistory() {
    double[] y = new double[24];
    for (int i = 0; i < 24; i++) y[i] = (i % 12 == 11) ? 1000 : 200; // every December is big
    // the next point (index 24) is a January -> small; index 23 was a December
    var r = Forecaster.forecast(y);
    assertTrue(r.value() < 500, "next month is not a December: " + r.value());
  }
}

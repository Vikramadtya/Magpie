package com.keeper.fx;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;

/** Converts between currencies' minor units (JPY has none, USD has 2, KWD has 3). */
public final class CurrencyUnits {
  private CurrencyUnits() {}

  public static int exponent(String code) {
    try {
      return Math.max(Currency.getInstance(code).getDefaultFractionDigits(), 0);
    } catch (IllegalArgumentException e) {
      return 2;
    }
  }

  /**
   * Converts {@code minor} of {@code from} into {@code to}, where rate = units of {@code from} per
   * 1 {@code to}.
   */
  public static long convert(long minor, String from, String to, BigDecimal ratePerTo) {
    if (from.equals(to)) return minor;
    BigDecimal major = BigDecimal.valueOf(minor).movePointLeft(exponent(from));
    BigDecimal toMajor = major.divide(ratePerTo, 12, RoundingMode.HALF_UP);
    return toMajor.movePointRight(exponent(to)).setScale(0, RoundingMode.HALF_UP).longValueExact();
  }
}

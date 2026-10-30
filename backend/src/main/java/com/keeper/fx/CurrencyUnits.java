package com.keeper.fx;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;

/** Minor-unit arithmetic (JPY has none, USD has 2, KWD has 3). */
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
   * Converts {@code minor} of {@code from} into {@code to}; rate = units of {@code to} per 1 {@code
   * from}.
   */
  public static long convert(long minor, String from, String to, BigDecimal rate) {
    if (from.equals(to)) return minor;
    BigDecimal major = BigDecimal.valueOf(minor).movePointLeft(exponent(from));
    return major
        .multiply(rate)
        .movePointRight(exponent(to))
        .setScale(0, RoundingMode.HALF_UP)
        .longValueExact();
  }
}

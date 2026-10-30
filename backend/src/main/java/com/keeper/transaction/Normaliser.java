package com.keeper.transaction;

import com.keeper.common.db.Db;
import com.keeper.fx.CurrencyUnits;
import com.keeper.fx.FxConverter;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Expresses a transaction in the workspace's base currency using the rate of the day it happened
 * (so reports stay stable as rates move). The user can override the result per transaction.
 */
@Singleton
public class Normaliser {
  private final Db db;
  private final FxConverter fx;

  public Normaliser(Db db, FxConverter fx) {
    this.db = db;
    this.fx = fx;
  }

  public String baseCurrency(UUID ws) {
    return db.one("SELECT base_currency FROM workspaces WHERE id = ?", rs -> rs.getString(1), ws)
        .orElse("USD");
  }

  public Normalised compute(UUID ws, String currency, long amountMinor, LocalDate date) {
    return compute(baseCurrency(ws), currency, amountMinor, date);
  }

  public Normalised compute(String base, String currency, long amountMinor, LocalDate date) {
    if (currency.equals(base)) return new Normalised(amountMinor, base, BigDecimal.ONE, false);
    return fx.rateOn(currency, base, date)
        .map(
            r ->
                new Normalised(
                    CurrencyUnits.convert(amountMinor, currency, base, r), base, r, false))
        .orElse(Normalised.NONE);
  }

  /** A user-chosen base amount: the implied rate is derived from it. */
  public Normalised manual(String base, String currency, long amountMinor, long baseMinor) {
    BigDecimal major =
        BigDecimal.valueOf(amountMinor).movePointLeft(CurrencyUnits.exponent(currency));
    BigDecimal baseMajor =
        BigDecimal.valueOf(baseMinor).movePointLeft(CurrencyUnits.exponent(base));
    BigDecimal rate =
        major.signum() == 0
            ? BigDecimal.ONE
            : baseMajor.divide(major, 10, java.math.RoundingMode.HALF_UP);
    return new Normalised(baseMinor, base, rate, true);
  }
}

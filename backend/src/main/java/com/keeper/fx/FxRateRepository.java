package com.keeper.fx;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/** Rates are stored against a single pivot currency; every other pair is derived from them. */
@Singleton
public class FxRateRepository {
  public static final String PIVOT = "USD";

  private final Db db;

  public FxRateRepository(Db db) {
    this.db = db;
  }

  /** Latest rate per currency: units of that currency per 1 USD (USD itself = 1). */
  public Map<String, BigDecimal> latest() {
    Map<String, BigDecimal> rates = new HashMap<>();
    db.list(
        "SELECT DISTINCT ON (quote) quote, rate FROM exchange_rates WHERE base = ? ORDER BY quote, as_of DESC",
        rs -> {
          rates.put(rs.getString("quote"), rs.getBigDecimal("rate"));
          return null;
        },
        PIVOT);
    rates.put(PIVOT, BigDecimal.ONE);
    return rates;
  }

  /** Rates stored for exactly this day. */
  public Map<String, BigDecimal> on(LocalDate date) {
    return load("SELECT quote, rate FROM exchange_rates WHERE base = ? AND as_of = ?", PIVOT, date);
  }

  /** Rates of the closest stored day on or before {@code date}, else the closest after it. */
  public Map<String, BigDecimal> nearest(LocalDate date) {
    Map<String, BigDecimal> before =
        load(
            "SELECT quote, rate FROM exchange_rates WHERE base = ? AND as_of = "
                + "(SELECT max(as_of) FROM exchange_rates WHERE base = ? AND as_of <= ?)",
            PIVOT,
            PIVOT,
            date);
    if (!before.isEmpty()) return before;
    return load(
        "SELECT quote, rate FROM exchange_rates WHERE base = ? AND as_of = "
            + "(SELECT min(as_of) FROM exchange_rates WHERE base = ? AND as_of >= ?)",
        PIVOT,
        PIVOT,
        date);
  }

  private Map<String, BigDecimal> load(String sql, Object... args) {
    Map<String, BigDecimal> rates = new HashMap<>();
    db.list(
        sql,
        rs -> {
          rates.put(rs.getString("quote"), rs.getBigDecimal("rate"));
          return null;
        },
        args);
    if (!rates.isEmpty()) rates.put(PIVOT, BigDecimal.ONE);
    return rates;
  }

  public Optional<LocalDate> newestDate() {
    return db.one(
        "SELECT max(as_of) FROM exchange_rates WHERE base = ?",
        rs -> rs.getObject(1, LocalDate.class),
        PIVOT);
  }

  public void save(Map<String, BigDecimal> perUsd, LocalDate asOf) {
    db.tx(
        () ->
            perUsd.forEach(
                (quote, rate) ->
                    db.update(
                        "INSERT INTO exchange_rates(base, quote, rate, as_of) VALUES (?,?,?,?) "
                            + "ON CONFLICT (base, quote, as_of) DO UPDATE SET rate = EXCLUDED.rate",
                        PIVOT,
                        quote,
                        rate,
                        asOf)));
  }
}

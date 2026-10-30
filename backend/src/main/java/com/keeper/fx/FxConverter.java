package com.keeper.fx;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Converts amounts into a workspace's base currency using the latest stored rates. A currency with
 * no stored rate is passed through unchanged and reported in {@link Converter#missing()}.
 */
@Singleton
public class FxConverter {
  private final Db db;

  public FxConverter(Db db) {
    this.db = db;
  }

  public Converter forWorkspace(UUID workspaceId) {
    String base =
        db.one(
                "SELECT base_currency FROM workspaces WHERE id = ?",
                rs -> rs.getString(1),
                workspaceId)
            .orElse("USD");
    Map<String, BigDecimal> rates = new HashMap<>();
    db.list(
        "SELECT DISTINCT ON (quote) quote, rate FROM exchange_rates WHERE base = ? ORDER BY quote, as_of DESC",
        rs -> {
          rates.put(rs.getString("quote"), rs.getBigDecimal("rate"));
          return null;
        },
        base);
    return new Converter(base, rates);
  }

  public static class Converter {
    private final String base;
    private final Map<String, BigDecimal> rates;
    private final java.util.Set<String> missing = new java.util.TreeSet<>();

    Converter(String base, Map<String, BigDecimal> rates) {
      this.base = base;
      this.rates = rates;
    }

    public String base() {
      return base;
    }

    public long toBase(long minor, String currency) {
      if (currency.equals(base)) return minor;
      BigDecimal rate = rates.get(currency);
      if (rate == null) {
        missing.add(currency);
        return minor;
      }
      return CurrencyUnits.convert(minor, currency, base, rate);
    }

    public java.util.Set<String> missing() {
      return missing;
    }
  }
}

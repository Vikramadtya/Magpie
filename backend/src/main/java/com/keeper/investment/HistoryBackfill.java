package com.keeper.investment;

import com.keeper.common.db.Db;
import com.keeper.fx.CurrencyUnits;
import com.keeper.fx.FxConverter;
import com.keeper.market.MarketDataService;
import com.keeper.market.PricePoint;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.OptionalLong;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Fills in what a holding was worth at each past month-end, from its purchase dates and the
 * market's price history, so the performance chart does not start empty on the day tracking began.
 */
@Singleton
public class HistoryBackfill {
  private static final Logger LOG = LoggerFactory.getLogger(HistoryBackfill.class);

  /** One purchase: when, and how many units. */
  public record Buy(LocalDate on, BigDecimal quantity) {}

  /** What the holding was worth at the end of a month. */
  public record Value(LocalDate asOf, BigDecimal quantity, BigDecimal price) {}

  private final Db db;
  private final MarketDataService market;
  private final FxConverter fx;
  private final ConcurrentHashMap<UUID, Instant> tried = new ConcurrentHashMap<>();

  public HistoryBackfill(Db db, MarketDataService market, FxConverter fx) {
    this.db = db;
    this.market = market;
    this.fx = fx;
  }

  /**
   * Month-end values from the first purchase up to last month: units held then, times the latest
   * price on or before that day (ignored when the nearest price is over 45 days old).
   */
  public static List<Value> monthEndValues(
      List<Buy> buys, List<PricePoint> prices, LocalDate today) {
    List<Value> out = new ArrayList<>();
    if (buys.isEmpty() || prices.isEmpty()) return out;
    LocalDate first = buys.stream().map(Buy::on).min(LocalDate::compareTo).orElseThrow();
    for (YearMonth m = YearMonth.from(first);
        m.isBefore(YearMonth.from(today));
        m = m.plusMonths(1)) {
      LocalDate end = m.atEndOfMonth();
      BigDecimal units =
          buys.stream()
              .filter(b -> !b.on().isAfter(end))
              .map(Buy::quantity)
              .reduce(BigDecimal.ZERO, BigDecimal::add);
      if (units.signum() <= 0) continue;
      PricePoint price =
          prices.stream().filter(p -> !p.date().isAfter(end)).reduce((a, b) -> b).orElse(null);
      if (price == null || price.date().isBefore(end.minusDays(45))) continue;
      out.add(new Value(end, units, price.price()));
    }
    return out;
  }

  /**
   * Workspaces' live holdings that have no past history yet; tried at most every six hours each.
   */
  public int backfillMissing(UUID ws) {
    List<UUID> ids =
        db.list(
            "SELECT h.id FROM holdings h WHERE h.workspace_id = ? AND h.price_source = 'LIVE' "
                + "AND h.provider_symbol IS NOT NULL AND EXISTS (SELECT 1 FROM holding_lots l WHERE l.holding_id = h.id) "
                + "AND NOT EXISTS (SELECT 1 FROM holding_values v WHERE v.holding_id = h.id "
                + "AND v.as_of < date_trunc('month', CURRENT_DATE))",
            rs -> rs.getObject(1, UUID.class),
            ws);
    int added = 0;
    for (UUID id : ids) {
      Instant last = tried.get(id);
      if (last != null && last.plusSeconds(6 * 3600).isAfter(Instant.now())) continue;
      tried.put(id, Instant.now());
      try {
        added += backfill(id);
      } catch (RuntimeException e) {
        LOG.warn("History backfill failed for a holding: {}", e.getMessage());
      }
    }
    return added;
  }

  /** Writes the missing month-end values for one holding; returns how many were added. */
  public int backfill(UUID holdingId) {
    record Row(String symbol, String currency) {}
    Row row =
        db.one(
                "SELECT provider_symbol, currency FROM holdings WHERE id = ? AND provider_symbol IS NOT NULL",
                rs -> new Row(rs.getString(1), rs.getString(2)),
                holdingId)
            .orElse(null);
    if (row == null) return 0;
    List<Buy> buys =
        db.list(
            "SELECT bought_on, quantity FROM holding_lots WHERE holding_id = ? ORDER BY bought_on",
            rs -> new Buy(rs.getObject(1, LocalDate.class), rs.getBigDecimal(2)),
            holdingId);
    List<PricePoint> prices = market.history(row.symbol());
    List<Value> values = monthEndValues(buys, prices, LocalDate.now());
    int added = 0;
    for (Value v : values) {
      String quoted = prices.get(0).currency() == null ? row.currency() : prices.get(0).currency();
      long priceMinor =
          v.price()
              .movePointRight(CurrencyUnits.exponent(quoted))
              .setScale(0, RoundingMode.HALF_UP)
              .longValue();
      if (!quoted.equals(row.currency())) {
        OptionalLong converted = fx.convert(priceMinor, quoted, row.currency());
        if (converted.isEmpty()) continue;
        priceMinor = converted.getAsLong();
      }
      long valueMinor =
          v.quantity()
              .multiply(BigDecimal.valueOf(priceMinor))
              .setScale(0, RoundingMode.HALF_UP)
              .longValue();
      added +=
          db.update(
              "INSERT INTO holding_values(holding_id, workspace_id, as_of, price_minor, quantity, value_minor) "
                  + "SELECT id, workspace_id, ?, ?, ?, ? FROM holdings WHERE id = ? ON CONFLICT DO NOTHING",
              v.asOf(),
              priceMinor,
              v.quantity(),
              valueMinor,
              holdingId);
    }
    return added;
  }
}

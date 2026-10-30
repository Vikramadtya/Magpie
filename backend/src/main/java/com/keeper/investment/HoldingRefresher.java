package com.keeper.investment;

import com.keeper.common.db.Db;
import com.keeper.fx.CurrencyUnits;
import com.keeper.fx.FxConverter;
import com.keeper.market.MarketDataService;
import com.keeper.market.Quote;
import io.micronaut.scheduling.TaskExecutors;
import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Named;
import jakarta.inject.Singleton;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Keeps live-linked holdings' prices current: on demand, in the background when stale, and hourly.
 */
@Singleton
public class HoldingRefresher {
  private static final Logger LOG = LoggerFactory.getLogger(HoldingRefresher.class);

  private record Row(UUID id, String symbol, String currency) {}

  private final Db db;
  private final MarketDataService market;
  private final FxConverter fx;
  private final ExecutorService executor;
  private final Set<UUID> inFlight = ConcurrentHashMap.newKeySet();

  public HoldingRefresher(
      Db db,
      MarketDataService market,
      FxConverter fx,
      @Named(TaskExecutors.BLOCKING) ExecutorService executor) {
    this.db = db;
    this.market = market;
    this.fx = fx;
    this.executor = executor;
  }

  /** Synchronously refreshes one workspace; returns how many holdings got a new price. */
  public int refreshWorkspace(UUID ws) {
    return apply(rows("workspace_id = ?", ws));
  }

  /** Fire-and-forget refresh if any live holding's price is older than 30 minutes. */
  public void refreshInBackgroundIfStale(UUID ws) {
    if (!market.isEnabled()) return;
    long stale =
        db.count(
            "SELECT count(*) FROM holdings WHERE workspace_id = ? AND price_source = 'LIVE' AND provider_symbol IS NOT NULL "
                + "AND (price_updated_at IS NULL OR price_updated_at < NOW() - INTERVAL '30 minutes')",
            ws);
    if (stale == 0 || !inFlight.add(ws)) return;
    executor.execute(
        () -> {
          try {
            refreshWorkspace(ws);
          } finally {
            inFlight.remove(ws);
          }
        });
  }

  @Scheduled(fixedDelay = "60m", initialDelay = "3m")
  public void refreshAll() {
    if (!market.isEnabled()) return;
    try {
      apply(rows("TRUE"));
    } catch (RuntimeException e) {
      LOG.warn("Holding price refresh failed: {}", e.getMessage());
    }
  }

  private List<Row> rows(String where, Object... args) {
    return db.list(
        "SELECT id, provider_symbol, currency FROM holdings WHERE price_source = 'LIVE' AND provider_symbol IS NOT NULL AND "
            + where,
        rs -> new Row(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)),
        args);
  }

  private int apply(List<Row> rows) {
    Map<String, Optional<Quote>> quotes = new HashMap<>();
    int updated = 0;
    for (Row row : rows) {
      Optional<Quote> q = quotes.computeIfAbsent(row.symbol(), market::quote);
      if (q.isEmpty()) continue;
      OptionalLong minor = priceIn(q.get(), row.currency());
      if (minor.isEmpty()) continue;
      db.update(
          "UPDATE holdings SET price_minor = ?, price_as_of = CURRENT_DATE, price_updated_at = NOW() WHERE id = ?",
          minor.getAsLong(),
          row.id());
      updated++;
    }
    return updated;
  }

  /**
   * The quote's price in the holding's own currency (converted if the market quotes another one).
   */
  public OptionalLong priceIn(Quote q, String holdingCurrency) {
    String quoteCurrency = q.currency() == null ? holdingCurrency : q.currency();
    long inQuoteCurrency =
        q.price()
            .movePointRight(CurrencyUnits.exponent(quoteCurrency))
            .setScale(0, RoundingMode.HALF_UP)
            .longValueExact();
    return quoteCurrency.equals(holdingCurrency)
        ? OptionalLong.of(inQuoteCurrency)
        : fx.convert(inQuoteCurrency, quoteCurrency, holdingCurrency);
  }
}

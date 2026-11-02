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

  /** A live price found for a symbol, expressed in the holding's currency. */
  public record Found(String providerSymbol, long minor) {}

  /**
   * Looks for a live price under the symbol as typed (and the Indian exchanges' suffixes for INR).
   * It is only accepted when the market quotes the same currency, which keeps a ticker that means
   * something else abroad from being linked by mistake.
   */
  public Optional<Found> findLive(String symbol, String currency) {
    if (!market.isEnabled() || symbol == null || symbol.isBlank()) return Optional.empty();
    String base = symbol.trim().toUpperCase();
    List<String> candidates = new java.util.ArrayList<>(List.of(base));
    if ("INR".equals(currency) && !base.contains(".")) {
      candidates.add(base + ".NS");
      candidates.add(base + ".BO");
    }
    for (String candidate : candidates) {
      Optional<Quote> q = market.quote(candidate);
      if (q.isEmpty() || !currency.equals(q.get().currency())) continue;
      OptionalLong minor = priceIn(q.get(), currency);
      if (minor.isPresent()) return Optional.of(new Found(candidate, minor.getAsLong()));
    }
    return Optional.empty();
  }

  /** Tries to link hand-entered holdings to a live price; remembers when it last tried. */
  private int linkManual(UUID ws, UUID onlyId) {
    int linked = 0;
    var rows =
        db.list(
            "SELECT id, symbol, currency FROM holdings WHERE workspace_id = ? AND provider_symbol IS NULL "
                + "AND price_source = 'MANUAL'"
                + (onlyId == null ? "" : " AND id = ?"),
            rs -> new Row(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)),
            onlyId == null ? new Object[] {ws} : new Object[] {ws, onlyId});
    for (Row row : rows) {
      Optional<Found> found = findLive(row.symbol(), row.currency());
      db.update("UPDATE holdings SET link_checked_at = NOW() WHERE id = ?", row.id());
      if (found.isEmpty()) continue;
      db.update(
          "UPDATE holdings SET provider_symbol = ?, price_source = 'LIVE', price_minor = ?, price_as_of = CURRENT_DATE, "
              + "price_updated_at = NOW() WHERE id = ?",
          found.get().providerSymbol(),
          found.get().minor(),
          row.id());
      linked++;
    }
    return linked;
  }

  /** Synchronously refreshes one workspace; returns how many holdings got a new price. */
  public int refreshWorkspace(UUID ws) {
    int linked = linkManual(ws, null);
    return linked + apply(rows("workspace_id = ?", ws));
  }

  /**
   * An explicit "refresh now": ignores recently cached quotes so the price really comes from the
   * market. {@code onlyId} limits it to one holding.
   */
  public int refreshNow(UUID ws, UUID onlyId) {
    var scope =
        db.list(
            "SELECT id, COALESCE(provider_symbol, symbol), currency FROM holdings WHERE workspace_id = ?"
                + (onlyId == null ? "" : " AND id = ?"),
            rs -> new Row(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)),
            onlyId == null ? new Object[] {ws} : new Object[] {ws, onlyId});
    scope.forEach(r -> market.forget(r.symbol()));
    int linked = linkManual(ws, onlyId);
    return linked
        + apply(
            onlyId == null
                ? rows("workspace_id = ?", ws)
                : rows("workspace_id = ? AND id = ?", ws, onlyId));
  }

  /** Fire-and-forget refresh if any live holding's price is older than 30 minutes. */
  public void refreshInBackgroundIfStale(UUID ws) {
    if (!market.isEnabled()) return;
    long stale =
        db.count(
            "SELECT count(*) FROM holdings WHERE workspace_id = ? AND ("
                + "(price_source = 'LIVE' AND provider_symbol IS NOT NULL "
                + "AND (price_updated_at IS NULL OR price_updated_at < NOW() - INTERVAL '30 minutes')) "
                + "OR (price_source = 'MANUAL' AND provider_symbol IS NULL "
                + "AND (link_checked_at IS NULL OR link_checked_at < NOW() - INTERVAL '6 hours')))",
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
      db.list(
              "SELECT DISTINCT workspace_id FROM holdings WHERE price_source = 'MANUAL' AND provider_symbol IS NULL",
              rs -> rs.getObject(1, UUID.class))
          .forEach(w -> linkManual(w, null));
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

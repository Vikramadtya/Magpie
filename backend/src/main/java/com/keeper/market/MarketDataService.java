package com.keeper.market;

import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Tries each provider in order, caches results briefly, and never fails: no data means "enter it by
 * hand".
 */
@Singleton
public class MarketDataService {
  private static final Duration QUOTE_TTL = Duration.ofMinutes(5);
  private static final Duration SEARCH_TTL = Duration.ofHours(1);

  private record Cached<T>(T value, Instant at) {
    boolean fresh(Duration ttl) {
      return Instant.now().isBefore(at.plus(ttl));
    }
  }

  private final List<MarketDataProvider> providers;
  private final boolean enabled;
  private final ConcurrentHashMap<String, Cached<List<SecurityHit>>> searches =
      new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, Cached<Quote>> quotes = new ConcurrentHashMap<>();
  private final ConcurrentHashMap<String, Cached<List<PricePoint>>> histories =
      new ConcurrentHashMap<>();
  private volatile boolean searchFailed;

  public MarketDataService(
      List<MarketDataProvider> providers, @Value("${keeper.market.enabled:true}") boolean enabled) {
    this.providers = providers;
    this.enabled = enabled;
  }

  public boolean isEnabled() {
    return enabled;
  }

  /** What each provider says right now, so an operator can see why prices are not arriving. */
  @io.micronaut.serde.annotation.Serdeable
  public record ProviderStatus(String provider, boolean ok, String error) {}

  public List<ProviderStatus> diagnose() {
    if (!enabled) return List.of();
    return providers.stream()
        .filter(p -> p.handles("AAPL"))
        .map(
            p -> {
              boolean ok = p.quote("AAPL").isPresent();
              return new ProviderStatus(p.name(), ok, ok ? null : p.lastError());
            })
        .toList();
  }

  public List<SecurityHit> search(String query) {
    String q = query == null ? "" : query.trim();
    if (!enabled || q.length() < 2) return List.of();
    String key = q.toLowerCase();
    Cached<List<SecurityHit>> hit = searches.get(key);
    if (hit != null && hit.fresh(SEARCH_TTL)) return hit.value();
    // Stocks and funds come from different sources, so results are combined; among stock sources
    // the first one that answers wins.
    List<SecurityHit> found = new java.util.ArrayList<>();
    boolean stocksAnswered = false;
    for (MarketDataProvider p : providers) {
      boolean fundSource = !p.handles("AAPL");
      if (!fundSource && stocksAnswered) continue;
      List<SecurityHit> part = p.search(q);
      if (!part.isEmpty()) {
        found.addAll(part);
        if (!fundSource) stocksAnswered = true;
      }
    }
    // Nothing found: either there is no match, or the price source did not answer. Say which.
    searchFailed =
        found.isEmpty()
            && providers.stream()
                .filter(p -> p.handles("AAPL"))
                .anyMatch(p -> p.lastError() != null);
    if (found.isEmpty()) return List.of();
    searches.put(key, new Cached<>(found, Instant.now()));
    return found;
  }

  /**
   * True when the last search found nothing because the source failed, not because nothing matched.
   */
  public boolean lastSearchFailed() {
    return searchFailed;
  }

  /**
   * Closing prices over time for a symbol, from the first source that has them (cached for hours).
   */
  public List<PricePoint> history(String symbol) {
    if (!enabled || symbol == null || symbol.isBlank()) return List.of();
    Cached<List<PricePoint>> hit = histories.get(symbol);
    if (hit != null && hit.fresh(Duration.ofHours(6))) return hit.value();
    for (MarketDataProvider p : providers) {
      if (!p.handles(symbol)) continue;
      List<PricePoint> points = p.history(symbol);
      if (!points.isEmpty()) {
        histories.put(symbol, new Cached<>(points, Instant.now()));
        return points;
      }
    }
    return hit == null ? List.of() : hit.value();
  }

  /** Drops the cached quote so the next lookup goes to the market (used by an explicit refresh). */
  public void forget(String symbol) {
    if (symbol != null) quotes.remove(symbol);
  }

  public Optional<Quote> quote(String symbol) {
    if (!enabled || symbol == null || symbol.isBlank()) return Optional.empty();
    Cached<Quote> hit = quotes.get(symbol);
    if (hit != null && hit.fresh(QUOTE_TTL)) return Optional.of(hit.value());
    for (MarketDataProvider p : providers) {
      if (!p.handles(symbol)) continue;
      Optional<Quote> q = p.quote(symbol);
      if (q.isPresent()) {
        quotes.put(symbol, new Cached<>(q.get(), Instant.now()));
        return q;
      }
    }
    return hit == null ? Optional.empty() : Optional.of(hit.value()); // stale beats nothing
  }
}

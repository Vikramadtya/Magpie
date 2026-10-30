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

  public MarketDataService(
      List<MarketDataProvider> providers, @Value("${keeper.market.enabled:true}") boolean enabled) {
    this.providers = providers;
    this.enabled = enabled;
  }

  public boolean isEnabled() {
    return enabled;
  }

  public List<SecurityHit> search(String query) {
    String q = query == null ? "" : query.trim();
    if (!enabled || q.length() < 2) return List.of();
    String key = q.toLowerCase();
    Cached<List<SecurityHit>> hit = searches.get(key);
    if (hit != null && hit.fresh(SEARCH_TTL)) return hit.value();
    for (MarketDataProvider p : providers) {
      List<SecurityHit> found = p.search(q);
      if (!found.isEmpty()) {
        searches.put(key, new Cached<>(found, Instant.now()));
        return found;
      }
    }
    return List.of();
  }

  public Optional<Quote> quote(String symbol) {
    if (!enabled || symbol == null || symbol.isBlank()) return Optional.empty();
    Cached<Quote> hit = quotes.get(symbol);
    if (hit != null && hit.fresh(QUOTE_TTL)) return Optional.of(hit.value());
    for (MarketDataProvider p : providers) {
      Optional<Quote> q = p.quote(symbol);
      if (q.isPresent()) {
        quotes.put(symbol, new Cached<>(q.get(), Instant.now()));
        return q;
      }
    }
    return hit == null ? Optional.empty() : Optional.of(hit.value()); // stale beats nothing
  }
}

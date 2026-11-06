package com.keeper.market;

import java.util.List;
import java.util.Optional;

/**
 * A source of security search and prices. Implementations never throw: they return empty on
 * failure.
 */
public interface MarketDataProvider {
  String name();

  /** Whether this source can price the symbol; funds use their own prefix. */
  default boolean handles(String symbol) {
    return !symbol.startsWith("MF:");
  }

  List<SecurityHit> search(String query);

  Optional<Quote> quote(String symbol);

  /**
   * Month-by-month (or finer) closing prices, oldest first; empty when the source has no history.
   */
  default List<PricePoint> history(String symbol) {
    return List.of();
  }

  /** Why the most recent call failed, or null when it worked; for the status page. */
  default String lastError() {
    return null;
  }
}

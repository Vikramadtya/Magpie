package com.keeper.market;

import java.util.List;
import java.util.Optional;

/**
 * A source of security search and prices. Implementations never throw: they return empty on
 * failure.
 */
public interface MarketDataProvider {
  String name();

  List<SecurityHit> search(String query);

  Optional<Quote> quote(String symbol);

  /** Why the most recent call failed, or null when it worked; for the status page. */
  default String lastError() {
    return null;
  }
}

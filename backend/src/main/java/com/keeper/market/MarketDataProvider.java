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
}

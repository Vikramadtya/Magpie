package com.keeper.market;

import io.micronaut.context.annotation.Requires;
import io.micronaut.context.annotation.Value;
import io.micronaut.core.order.Ordered;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Used as a fallback when ALPHA_VANTAGE_API_KEY is configured (free tier: ~25 calls/day). */
@Singleton
@Requires(property = "keeper.market.alphavantage-key")
public class AlphaVantageProvider implements MarketDataProvider, Ordered {
  private static final Logger LOG = LoggerFactory.getLogger(AlphaVantageProvider.class);

  private final HttpClient client;
  private final String key;
  private final ConcurrentHashMap<String, SecurityHit> seen = new ConcurrentHashMap<>();

  public AlphaVantageProvider(
      @Client("https://www.alphavantage.co") HttpClient client,
      @Value("${keeper.market.alphavantage-key}") String key) {
    this.client = client;
    this.key = key;
  }

  @Override
  public String name() {
    return "alphavantage";
  }

  @Override
  public int getOrder() {
    return 10;
  }

  @Override
  public List<SecurityHit> search(String query) {
    try {
      Map<?, ?> body =
          client
              .toBlocking()
              .retrieve(
                  HttpRequest.GET(
                      "/query?function=SYMBOL_SEARCH&apikey="
                          + key
                          + "&keywords="
                          + URLEncoder.encode(query, StandardCharsets.UTF_8)),
                  Map.class);
      List<SecurityHit> hits = new ArrayList<>();
      if (body.get("bestMatches") instanceof List<?> matches) {
        for (Object o : matches) {
          if (!(o instanceof Map<?, ?> m)) continue;
          SecurityHit hit =
              new SecurityHit(
                  String.valueOf(m.get("1. symbol")),
                  String.valueOf(m.get("2. name")),
                  String.valueOf(m.get("4. region")),
                  String.valueOf(m.get("3. type")),
                  String.valueOf(m.get("8. currency")));
          seen.put(hit.symbol(), hit);
          hits.add(hit);
        }
      }
      return hits;
    } catch (RuntimeException e) {
      LOG.warn("Alpha Vantage search failed: {}", e.getMessage());
      return List.of();
    }
  }

  @Override
  public Optional<Quote> quote(String symbol) {
    try {
      Map<?, ?> body =
          client
              .toBlocking()
              .retrieve(
                  HttpRequest.GET(
                      "/query?function=GLOBAL_QUOTE&apikey="
                          + key
                          + "&symbol="
                          + URLEncoder.encode(symbol, StandardCharsets.UTF_8)),
                  Map.class);
      if (!(body.get("Global Quote") instanceof Map<?, ?> q) || q.get("05. price") == null) {
        return Optional.empty();
      }
      SecurityHit hit = seen.get(symbol);
      return Optional.of(
          new Quote(
              symbol,
              hit == null ? symbol : hit.name(),
              new BigDecimal(String.valueOf(q.get("05. price"))),
              hit == null ? null : hit.currency(),
              hit == null ? null : hit.exchange(),
              Instant.now(),
              "alphavantage"));
    } catch (RuntimeException e) {
      LOG.warn("Alpha Vantage quote failed for {}: {}", symbol, e.getMessage());
      return Optional.empty();
    }
  }
}

package com.keeper.market;

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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Yahoo Finance's public endpoints: no key, covers US and Indian (.NS / .BO) listings and indices.
 * It is unofficial and may rate-limit cloud hosts, so callers fall back to other sources or manual
 * prices.
 */
@Singleton
public class YahooFinanceProvider implements MarketDataProvider, Ordered {
  private static final Logger LOG = LoggerFactory.getLogger(YahooFinanceProvider.class);
  // Identify ourselves honestly. If Yahoo throttles us, MarketDataService falls back to other
  // providers
  // or the user's manual price; we do not try to disguise the client.
  private static final String UA = "Keeper/1.0 (personal finance app)";

  private final HttpClient searchClient;
  private final HttpClient chartClient;

  public YahooFinanceProvider(
      @Client("https://query2.finance.yahoo.com") HttpClient searchClient,
      @Client("https://query1.finance.yahoo.com") HttpClient chartClient) {
    this.searchClient = searchClient;
    this.chartClient = chartClient;
  }

  @Override
  public String name() {
    return "yahoo";
  }

  @Override
  public int getOrder() {
    return 0;
  }

  @Override
  public List<SecurityHit> search(String query) {
    try {
      String uri =
          "/v1/finance/search?quotesCount=10&newsCount=0&listsCount=0&q="
              + URLEncoder.encode(query, StandardCharsets.UTF_8);
      Map<?, ?> body =
          searchClient
              .toBlocking()
              .retrieve(HttpRequest.GET(uri).header("User-Agent", UA), Map.class);
      return parseSearch(body);
    } catch (RuntimeException e) {
      LOG.warn("Yahoo search failed: {}", e.getMessage());
      return List.of();
    }
  }

  @Override
  public Optional<Quote> quote(String symbol) {
    try {
      String uri =
          "/v8/finance/chart/"
              + URLEncoder.encode(symbol, StandardCharsets.UTF_8)
              + "?range=1d&interval=1d";
      Map<?, ?> body =
          chartClient
              .toBlocking()
              .retrieve(HttpRequest.GET(uri).header("User-Agent", UA), Map.class);
      return parseChart(body);
    } catch (RuntimeException e) {
      LOG.warn("Yahoo quote failed for {}: {}", symbol, e.getMessage());
      return Optional.empty();
    }
  }

  static List<SecurityHit> parseSearch(Map<?, ?> body) {
    List<SecurityHit> hits = new ArrayList<>();
    if (!(body.get("quotes") instanceof List<?> quotes)) return hits;
    for (Object o : quotes) {
      if (!(o instanceof Map<?, ?> q) || q.get("symbol") == null) continue;
      String type = str(q.get("quoteType"));
      if (!List.of("EQUITY", "ETF", "INDEX", "MUTUALFUND", "CRYPTOCURRENCY").contains(type))
        continue;
      String name = q.get("longname") != null ? str(q.get("longname")) : str(q.get("shortname"));
      hits.add(new SecurityHit(str(q.get("symbol")), name, str(q.get("exchDisp")), type, null));
    }
    return hits;
  }

  static Optional<Quote> parseChart(Map<?, ?> body) {
    if (!(body.get("chart") instanceof Map<?, ?> chart)) return Optional.empty();
    if (!(chart.get("result") instanceof List<?> results) || results.isEmpty())
      return Optional.empty();
    if (!(results.get(0) instanceof Map<?, ?> result)
        || !(result.get("meta") instanceof Map<?, ?> meta)) {
      return Optional.empty();
    }
    if (!(meta.get("regularMarketPrice") instanceof Number price)) return Optional.empty();
    String currency = str(meta.get("currency"));
    BigDecimal value = new BigDecimal(price.toString());
    // London quotes in pence (GBp) and Johannesburg in cents (ZAc): normalise to the major unit
    if ("GBp".equals(currency) || "ZAc".equals(currency)) {
      value = value.movePointLeft(2);
      currency = currency.substring(0, 3).toUpperCase();
    }
    String name =
        meta.get("longName") != null ? str(meta.get("longName")) : str(meta.get("shortName"));
    Instant asOf =
        meta.get("regularMarketTime") instanceof Number t
            ? Instant.ofEpochSecond(t.longValue())
            : Instant.now();
    return Optional.of(
        new Quote(
            str(meta.get("symbol")),
            name,
            value,
            currency,
            str(meta.get("fullExchangeName")),
            asOf,
            "yahoo"));
  }

  private static String str(Object o) {
    return o == null ? null : o.toString();
  }
}

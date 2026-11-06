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
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Indian mutual fund NAVs from mfapi.in (AMFI data, no key). Funds are addressed as {@code
 * MF:<scheme code>}, which keeps them apart from stock tickers.
 */
@Singleton
public class MfApiProvider implements MarketDataProvider, Ordered {
  private static final Logger LOG = LoggerFactory.getLogger(MfApiProvider.class);
  static final String PREFIX = "MF:";
  private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd-MM-yyyy");

  private final HttpClient client;
  private final java.util.concurrent.atomic.AtomicReference<String> lastError =
      new java.util.concurrent.atomic.AtomicReference<>();

  public MfApiProvider(@Client("https://api.mfapi.in") HttpClient client) {
    this.client = client;
  }

  @Override
  public String name() {
    return "mfapi";
  }

  @Override
  public int getOrder() {
    return 20;
  }

  @Override
  public boolean handles(String symbol) {
    return symbol != null && symbol.startsWith(PREFIX);
  }

  @Override
  public String lastError() {
    return lastError.get();
  }

  @Override
  public List<SecurityHit> search(String query) {
    try {
      Object body =
          client
              .toBlocking()
              .retrieve(
                  HttpRequest.GET(
                      "/mf/search?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8)),
                  Object.class);
      return parseSearch(body);
    } catch (RuntimeException e) {
      LOG.warn("Fund search failed: {}", e.getMessage());
      return List.of();
    }
  }

  @Override
  public Optional<Quote> quote(String symbol) {
    if (!handles(symbol)) return Optional.empty();
    String code = symbol.substring(PREFIX.length()).trim();
    if (!code.matches("\\d{1,8}")) return Optional.empty();
    try {
      Map<?, ?> body =
          client.toBlocking().retrieve(HttpRequest.GET("/mf/" + code + "/latest"), Map.class);
      var parsed = parseLatest(symbol, body);
      lastError.set(parsed.isPresent() ? null : "No NAV in the response for " + symbol);
      return parsed;
    } catch (RuntimeException e) {
      lastError.set(e.getClass().getSimpleName() + ": " + e.getMessage());
      LOG.warn("Fund NAV failed for {}: {}", symbol, e.getMessage());
      return Optional.empty();
    }
  }

  @Override
  public List<PricePoint> history(String symbol) {
    if (!handles(symbol)) return List.of();
    String code = symbol.substring(PREFIX.length()).trim();
    if (!code.matches("\\d{1,8}")) return List.of();
    try {
      Map<?, ?> body = client.toBlocking().retrieve(HttpRequest.GET("/mf/" + code), Map.class);
      return parseHistory(body);
    } catch (RuntimeException e) {
      LOG.warn("Fund history failed for {}: {}", symbol, e.getMessage());
      return List.of();
    }
  }

  /** The API lists every day newest first as dd-MM-yyyy; this returns them oldest first. */
  static List<PricePoint> parseHistory(Map<?, ?> body) {
    List<PricePoint> points = new ArrayList<>();
    if (!(body.get("data") instanceof List<?> data)) return points;
    var format = java.time.format.DateTimeFormatter.ofPattern("dd-MM-yyyy");
    for (Object o : data) {
      if (!(o instanceof Map<?, ?> row) || row.get("date") == null || row.get("nav") == null)
        continue;
      try {
        points.add(
            new PricePoint(
                java.time.LocalDate.parse(String.valueOf(row.get("date")), format),
                new BigDecimal(String.valueOf(row.get("nav"))),
                "INR"));
      } catch (RuntimeException skip) {
        // a malformed row is skipped rather than losing the whole history
      }
    }
    java.util.Collections.reverse(points);
    return points;
  }

  static List<SecurityHit> parseSearch(Object body) {
    List<SecurityHit> hits = new ArrayList<>();
    if (!(body instanceof List<?> rows)) return hits;
    for (Object o : rows) {
      if (!(o instanceof Map<?, ?> row) || row.get("schemeCode") == null) continue;
      hits.add(
          new SecurityHit(
              PREFIX + row.get("schemeCode"),
              String.valueOf(row.get("schemeName")),
              "AMFI",
              "MUTUALFUND",
              "INR"));
      if (hits.size() >= 10) break;
    }
    return hits;
  }

  static Optional<Quote> parseLatest(String symbol, Map<?, ?> body) {
    if (!(body.get("data") instanceof List<?> data) || data.isEmpty()) return Optional.empty();
    if (!(data.get(0) instanceof Map<?, ?> latest) || latest.get("nav") == null)
      return Optional.empty();
    BigDecimal nav;
    try {
      nav = new BigDecimal(String.valueOf(latest.get("nav")));
    } catch (NumberFormatException e) {
      return Optional.empty();
    }
    if (nav.signum() <= 0) return Optional.empty();
    String name =
        body.get("meta") instanceof Map<?, ?> meta && meta.get("scheme_name") != null
            ? String.valueOf(meta.get("scheme_name"))
            : symbol;
    Instant asOf = Instant.now();
    try {
      asOf =
          LocalDate.parse(String.valueOf(latest.get("date")), DAY)
              .atStartOfDay(ZoneId.of("Asia/Kolkata"))
              .toInstant();
    } catch (RuntimeException ignored) {
      // keep "now" when the date is in an unexpected format
    }
    return Optional.of(new Quote(symbol, name, nav, "INR", "AMFI", asOf, "mfapi"));
  }
}

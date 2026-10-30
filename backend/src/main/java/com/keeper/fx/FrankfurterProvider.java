package com.keeper.fx;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/** ECB reference rates via frankfurter.dev (free, no key). */
@Singleton
public class FrankfurterProvider implements FxRateProvider {
  private final HttpClient client;

  public FrankfurterProvider(@Client("https://api.frankfurter.dev") HttpClient client) {
    this.client = client;
  }

  @Override
  public Map<String, BigDecimal> historical(String base, java.time.LocalDate date) {
    Map<?, ?> body =
        client.toBlocking().retrieve(HttpRequest.GET("/v1/" + date + "?base=" + base), Map.class);
    Map<String, BigDecimal> rates = new HashMap<>();
    ((Map<?, ?>) body.get("rates"))
        .forEach((k, v) -> rates.put(k.toString(), new BigDecimal(v.toString())));
    return rates;
  }

  @Override
  public Map<String, BigDecimal> latest(String base) {
    Map<?, ?> body =
        client.toBlocking().retrieve(HttpRequest.GET("/v1/latest?base=" + base), Map.class);
    Map<String, BigDecimal> rates = new HashMap<>();
    ((Map<?, ?>) body.get("rates"))
        .forEach((k, v) -> rates.put(k.toString(), new BigDecimal(v.toString())));
    return rates;
  }
}

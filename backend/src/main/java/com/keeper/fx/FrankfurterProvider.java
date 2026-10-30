package com.keeper.fx;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

/** ECB reference rates via frankfurter.app (free, no key). */
@Singleton
public class FrankfurterProvider implements FxRateProvider {
  private final HttpClient client;

  public FrankfurterProvider(@Client("https://api.frankfurter.app") HttpClient client) {
    this.client = client;
  }

  @Override
  public Map<String, BigDecimal> latest(String base) {
    Map<?, ?> body =
        client.toBlocking().retrieve(HttpRequest.GET("/latest?from=" + base), Map.class);
    Map<String, BigDecimal> rates = new HashMap<>();
    ((Map<?, ?>) body.get("rates"))
        .forEach((k, v) -> rates.put(k.toString(), new BigDecimal(v.toString())));
    return rates;
  }
}

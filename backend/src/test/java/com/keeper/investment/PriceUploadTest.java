package com.keeper.investment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.ApiTestBase;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PriceUploadTest extends ApiTestBase {

  private Map<?, ?> holding(Session s, String symbol, String currency, int priceMinor) {
    return post(
        s.token(),
        "/api/v1/workspaces/" + s.workspaceId() + "/holdings",
        Map.of(
            "symbol", symbol,
            "name", symbol,
            "quantity", 10,
            "costBasisMinor", 1000,
            "priceMinor", priceMinor,
            "currency", currency),
        Map.class);
  }

  private Map<?, ?> upload(Session s, List<Map<String, Object>> prices) {
    return post(
        s.token(),
        "/api/v1/workspaces/" + s.workspaceId() + "/holdings/prices",
        Map.of("prices", prices),
        Map.class);
  }

  @Test
  void uploadedPricesUpdateMatchingHoldingsAndReportTheRest() {
    Session s = register("prices");
    holding(s, "ZZTEST", "USD", 100);

    Map<?, ?> result =
        upload(
            s,
            List.of(
                Map.of("symbol", "zztest", "price", 123.45, "currency", "USD"),
                Map.of("symbol", "NOPE", "price", 5)));

    assertEquals(1, result.get("updated"));
    assertEquals(List.of("NOPE"), result.get("unmatched"));
    var holdings = getList(s.token(), "/api/v1/workspaces/" + s.workspaceId() + "/holdings");
    assertEquals(12_345, ((Number) holdings.get(0).get("priceMinor")).intValue());
  }

  @Test
  void aPriceMustBePositive() {
    Session s = register("prices-bad");
    holding(s, "ZZBAD", "USD", 100);
    var request =
        HttpRequest.POST(
                "/api/v1/workspaces/" + s.workspaceId() + "/holdings/prices",
                Map.of("prices", List.of(Map.of("symbol", "ZZBAD", "price", -1))))
            .bearerAuth(s.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(request));
    assertTrue(
        getList(s.token(), "/api/v1/workspaces/" + s.workspaceId() + "/holdings")
            .get(0)
            .get("priceMinor")
            .equals(100));
  }
}

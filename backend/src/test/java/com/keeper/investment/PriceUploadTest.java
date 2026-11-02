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

  @Test
  void theBuyDateIsKept() {
    Session s = register("bought");
    Map<?, ?> created =
        post(
            s.token(),
            "/api/v1/workspaces/" + s.workspaceId() + "/holdings",
            Map.of(
                "symbol",
                "ZZDATE",
                "name",
                "Dated",
                "quantity",
                2,
                "costBasisMinor",
                5000,
                "priceMinor",
                3000,
                "currency",
                "USD",
                "purchasedOn",
                "2025-03-14"),
            Map.class);
    assertEquals("2025-03-14", created.get("purchasedOn"));
  }

  @Test
  void netWorthIncludesHoldingsAtMarketValue() {
    Session s = register("worth");
    String ws = "/api/v1/workspaces/" + s.workspaceId();
    post(
        s.token(),
        ws + "/holdings",
        Map.of(
            "symbol",
            "ZZNW",
            "name",
            "Worth",
            "quantity",
            10,
            "unitPriceMinor",
            1000,
            "priceMinor",
            1500,
            "currency",
            "USD"),
        Map.class);
    Map<?, ?> d = get(s.token(), ws + "/dashboard", Map.class);
    assertEquals(15_000, ((Number) d.get("investmentsMinor")).intValue());
    assertEquals(15_000, ((Number) d.get("netWorthMinor")).intValue());
  }

  @Test
  void aHoldingIsTheSumOfItsPurchases() {
    Session s = register("lots");
    String base = "/api/v1/workspaces/" + s.workspaceId() + "/holdings";
    Map<?, ?> h =
        post(
            s.token(),
            base,
            Map.of(
                "symbol",
                "ZZLOT",
                "name",
                "Lots",
                "quantity",
                10,
                "unitPriceMinor",
                1000,
                "priceMinor",
                1500,
                "currency",
                "USD",
                "purchasedOn",
                "2025-01-10"),
            Map.class);
    String id = (String) h.get("id");
    assertEquals(10_000, ((Number) h.get("costBasisMinor")).intValue());

    Map<?, ?> after =
        post(
            s.token(),
            base + "/" + id + "/lots",
            Map.of("boughtOn", "2025-06-01", "quantity", 5, "unitPriceMinor", 1200),
            Map.class);
    assertEquals(16_000, ((Number) after.get("costBasisMinor")).intValue());
    assertEquals(15, ((Number) after.get("quantity")).intValue());
    assertEquals("2025-01-10", after.get("purchasedOn"));
    assertEquals(2, ((Number) after.get("lotCount")).intValue());

    var lots = getList(s.token(), base + "/" + id + "/lots");
    assertEquals(2, lots.size());
    String firstLot = (String) lots.get(0).get("id");
    Map<?, ?> removed =
        http()
            .retrieve(
                HttpRequest.DELETE(base + "/" + id + "/lots/" + firstLot).bearerAuth(s.token()),
                Map.class);
    assertEquals(6_000, ((Number) removed.get("costBasisMinor")).intValue());
    assertEquals("2025-06-01", removed.get("purchasedOn"));
  }
}

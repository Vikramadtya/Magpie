package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RefundTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String account(Session s) {
    return (String)
        post(
                s.token(),
                ws(s) + "/accounts",
                Map.of(
                    "name",
                    "Card",
                    "type",
                    "CHECKING",
                    "currency",
                    "USD",
                    "openingBalanceMinor",
                    100_000),
                Map.class)
            .get("id");
  }

  private String purchase(Session s, String acc, String type, int minor) {
    return (String)
        post(
                s.token(),
                ws(s) + "/transactions",
                Map.of(
                    "accountId",
                    acc,
                    "type",
                    type,
                    "amountMinor",
                    minor,
                    "occurredOn",
                    LocalDate.now().toString(),
                    "note",
                    "Shoes that did not fit"),
                Map.class)
            .get("id");
  }

  private Map<?, ?> overview(Session s) {
    return get(s.token(), ws(s) + "/refunds", Map.class);
  }

  private long balance(Session s, String acc) {
    return ((Number) get(s.token(), ws(s) + "/accounts/" + acc, Map.class).get("balanceMinor"))
        .longValue();
  }

  @Test
  void aPurchaseCanWaitForARefundAndBeCompletedIntoAnAccount() {
    Session s = register("refund");
    String acc = account(s);
    String cat =
        (String)
            post(
                    s.token(),
                    ws(s) + "/categories",
                    Map.of("name", "Shoes Z", "kind", "EXPENSE"),
                    Map.class)
                .get("id");
    String tx =
        (String)
            post(
                    s.token(),
                    ws(s) + "/transactions",
                    Map.of(
                        "accountId",
                        acc,
                        "type",
                        "EXPENSE",
                        "amountMinor",
                        8_000,
                        "occurredOn",
                        LocalDate.now().toString(),
                        "categoryId",
                        cat),
                    Map.class)
                .get("id");

    Map<?, ?> refund =
        post(
            s.token(),
            ws(s) + "/refunds",
            Map.of("transactionId", tx, "expectedMinor", 6_000, "note", "Return by Friday"),
            Map.class);
    assertEquals("PENDING", refund.get("status"));
    assertEquals(6_000, ((Number) refund.get("expectedMinor")).intValue());
    assertEquals("Return by Friday", refund.get("note"));
    assertEquals(1, ((Number) overview(s).get("pendingCount")).intValue());
    assertEquals(6_000, ((Number) overview(s).get("pendingMinor")).intValue());

    Map<?, ?> edited =
        patch(
            s.token(),
            ws(s) + "/refunds/" + refund.get("id"),
            Map.of("expectedMinor", 7_000),
            Map.class);
    assertEquals(7_000, ((Number) edited.get("expectedMinor")).intValue());

    long before = balance(s, acc);
    Map<?, ?> done =
        post(
            s.token(),
            ws(s) + "/refunds/" + refund.get("id") + "/complete",
            Map.of(
                "receivedMinor", 7_000, "receivedOn", LocalDate.now().toString(), "accountId", acc),
            Map.class);
    assertEquals("DONE", done.get("status"));
    assertNotNull(done.get("refundTransactionId"));
    assertEquals(before + 7_000, balance(s, acc));
    Map<?, ?> o = overview(s);
    assertEquals(0, ((Number) o.get("pendingCount")).intValue());
    assertEquals(7_000, ((Number) o.get("receivedMinor")).intValue());

    var again =
        HttpRequest.POST(
                ws(s) + "/refunds/" + refund.get("id") + "/complete",
                Map.of("receivedMinor", 1, "receivedOn", LocalDate.now().toString()))
            .bearerAuth(s.token());
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, statusOf(again));
  }

  @Test
  void completingWithoutAnAccountOnlyClosesTheRefund() {
    Session s = register("refund-plain");
    String acc = account(s);
    String tx = purchase(s, acc, "EXPENSE", 3_000);
    Map<?, ?> refund = post(s.token(), ws(s) + "/refunds", Map.of("transactionId", tx), Map.class);
    assertEquals(3_000, ((Number) refund.get("expectedMinor")).intValue()); // whole purchase

    long before = balance(s, acc);
    Map<?, ?> done =
        post(
            s.token(),
            ws(s) + "/refunds/" + refund.get("id") + "/complete",
            Map.of("receivedMinor", 2_500, "receivedOn", LocalDate.now().toString()),
            Map.class);
    assertNull(done.get("refundTransactionId"));
    assertEquals(before, balance(s, acc));
  }

  @Test
  void rulesAreEnforcedAndOtherWorkspacesCannotSeeThem() {
    Session s = register("refund-rules");
    String acc = account(s);
    String tx = purchase(s, acc, "EXPENSE", 1_000);
    String income = purchase(s, acc, "INCOME", 1_000);

    for (Map<String, Object> bad :
        List.<Map<String, Object>>of(
            Map.of("transactionId", income),
            Map.of("transactionId", tx, "expectedMinor", 1_001),
            Map.of("transactionId", java.util.UUID.randomUUID().toString()))) {
      var r = HttpRequest.POST(ws(s) + "/refunds", bad).bearerAuth(s.token());
      assertEquals(true, statusOf(r).getCode() >= 400);
    }
    post(s.token(), ws(s) + "/refunds", Map.of("transactionId", tx), Map.class);
    var twice =
        HttpRequest.POST(ws(s) + "/refunds", Map.of("transactionId", tx)).bearerAuth(s.token());
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, statusOf(twice));

    Session other = register("refund-other");
    var peek = HttpRequest.GET(ws(s) + "/refunds").bearerAuth(other.token());
    assertEquals(true, statusOf(peek).getCode() >= 400);
    assertEquals(0, ((List<?>) overview(other).get("items")).size());
  }
}

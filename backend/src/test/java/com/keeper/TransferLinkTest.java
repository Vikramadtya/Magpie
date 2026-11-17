package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TransferLinkTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String account(Session s, String name, int opening) {
    return (String)
        post(
                s.token(),
                ws(s) + "/accounts",
                Map.of(
                    "name",
                    name,
                    "type",
                    "CHECKING",
                    "currency",
                    "USD",
                    "openingBalanceMinor",
                    opening),
                Map.class)
            .get("id");
  }

  private String entry(Session s, String acc, String type, int minor) {
    Map<String, Object> body =
        new HashMap<>(
            Map.of(
                "accountId",
                acc,
                "type",
                type,
                "amountMinor",
                minor,
                "occurredOn",
                LocalDate.now().toString()));
    return (String) post(s.token(), ws(s) + "/transactions", body, Map.class).get("id");
  }

  private long balance(Session s, String acc) {
    return ((Number) get(s.token(), ws(s) + "/accounts/" + acc, Map.class).get("balanceMinor"))
        .longValue();
  }

  @Test
  void aSpendingAndAnIncomeOfTheSameAmountBecomeOneTransfer() {
    Session s = register("link");
    String a = account(s, "Bank", 100_000);
    String b = account(s, "Wallet", 0);
    String out = entry(s, a, "EXPENSE", 5_000);
    String in = entry(s, b, "INCOME", 5_000);
    long balA = balance(s, a);
    long balB = balance(s, b);

    var matches = getList(s.token(), ws(s) + "/transactions/" + out + "/transfer-matches");
    assertEquals(1, matches.size());
    assertEquals(in, matches.get(0).get("id"));

    var linked =
        postList(
            s.token(),
            ws(s) + "/transactions/link-transfer",
            Map.of("firstId", in, "secondId", out));
    assertEquals(2, linked.size());
    assertEquals("TRANSFER", linked.get(0).get("type"));
    assertNotNull(linked.get(0).get("transferId"));
    assertEquals(linked.get(0).get("transferId"), linked.get(1).get("transferId"));
    // nothing moved: only the labels changed
    assertEquals(balA, balance(s, a));
    assertEquals(balB, balance(s, b));
  }

  @Test
  void onlyMatchingEntriesInDifferentAccountsCanBeJoined() {
    Session s = register("link-rules");
    String a = account(s, "A", 10_000);
    String b = account(s, "B", 0);
    String x = entry(s, a, "EXPENSE", 1_000);
    String sameAccountIncome = entry(s, a, "INCOME", 1_000);
    String otherAmount = entry(s, b, "INCOME", 900);
    for (String partner : List.of(sameAccountIncome, otherAmount)) {
      var r =
          HttpRequest.POST(
                  ws(s) + "/transactions/link-transfer", Map.of("firstId", x, "secondId", partner))
              .bearerAuth(s.token());
      assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, statusOf(r));
    }
  }

  @Test
  void aChangeCanBeAppliedToEverythingAFilterMatchesAndIsRefusedIfTheCountMoved() {
    Session s = register("bulk");
    String acc = account(s, "Card", 0);
    String cat =
        (String)
            post(
                    s.token(),
                    ws(s) + "/categories",
                    Map.of("name", "Bulk Z", "kind", "EXPENSE"),
                    Map.class)
                .get("id");
    for (int i = 0; i < 3; i++) entry(s, acc, "EXPENSE", 100 + i);

    Map<String, Object> body =
        new HashMap<>(
            Map.of(
                "action",
                "RECATEGORIZE",
                "categoryId",
                cat,
                "expected",
                4,
                "accountIds",
                acc,
                "uncategorised",
                true));
    var stale = HttpRequest.POST(ws(s) + "/transactions/bulk-filtered", body).bearerAuth(s.token());
    assertEquals(HttpStatus.CONFLICT, statusOf(stale)); // it matches 3, not 4

    body.put("expected", 3);
    Map<?, ?> done = post(s.token(), ws(s) + "/transactions/bulk-filtered", body, Map.class);
    assertEquals(3, ((Number) done.get("matched")).intValue());
    assertEquals(3, ((Number) done.get("applied")).intValue());
    Map<?, ?> list = get(s.token(), ws(s) + "/transactions?categoryId=" + cat, Map.class);
    assertEquals(3, ((List<?>) list.get("items")).size());
  }
}

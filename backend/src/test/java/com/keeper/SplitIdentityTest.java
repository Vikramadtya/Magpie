package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micronaut.http.HttpRequest;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SplitIdentityTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String emailOf(Session s) {
    return (String) ((Map<?, ?>) get(s.token(), "/api/v1/me", Map.class).get("user")).get("email");
  }

  private String connection(Session s) {
    return (String)
        post(s.token(), ws(s) + "/api-tokens", Map.of("name", "Expense split"), Map.class)
            .get("secret");
  }

  private int introduce(String secret, String personId, String name, String email) {
    Map<String, Object> me = new HashMap<>();
    me.put("personId", personId);
    me.put("name", name);
    if (email != null) me.put("email", email);
    return exchange(HttpRequest.POST("/api/v1/ingest/connect", Map.of("me", me)).bearerAuth(secret))
        .getStatus()
        .getCode();
  }

  @Test
  void theConnectionIsBoundToOneSplitAppPerson() {
    Session s = register("ident");
    String secret = connection(s);

    assertEquals(200, introduce(secret, "u_asha", "Asha", emailOf(s)));
    Map<?, ?> token = (Map<?, ?>) getList(s.token(), ws(s) + "/api-tokens").get(0);
    assertEquals("Asha", token.get("externalName"));
    assertEquals(true, token.get("emailMatched"));
    Map<?, ?> ping =
        http().retrieve(HttpRequest.GET("/api/v1/ingest/ping").bearerAuth(secret), Map.class);
    assertEquals(true, ping.get("linked"));

    // Saying the same thing again is fine; claiming to be someone else is not.
    assertEquals(200, introduce(secret, "u_asha", "Asha K", emailOf(s)));
    assertEquals(409, introduce(secret, "u_someone_else", "Someone", null));
  }

  @Test
  void aDifferentEmailIsFlaggedButStillLinks() {
    Session s = register("ident2");
    String secret = connection(s);
    assertEquals(200, introduce(secret, "u_asha", "Asha", "other@example.com"));
    Map<?, ?> token = (Map<?, ?>) getList(s.token(), ws(s) + "/api-tokens").get(0);
    assertEquals(false, token.get("emailMatched"));
  }

  @Test
  void friendsAreMatchedByIdAndTheOwnerCanRenameThem() {
    Session s = register("ident3");
    String secret = connection(s);
    String card =
        (String)
            post(
                    s.token(),
                    ws(s) + "/accounts",
                    Map.of(
                        "name",
                        "Visa",
                        "type",
                        "CREDIT_CARD",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        0),
                    Map.class)
                .get("id");

    Map<String, Object> item = new HashMap<>();
    item.put("type", "EXPENSE");
    item.put("externalId", "e1");
    item.put("groupId", "g1");
    item.put("groupName", "Lisbon");
    item.put("occurredOn", LocalDate.now().toString());
    item.put("currency", "USD");
    item.put("totalMinor", 30_000);
    item.put("title", "Dinner");
    item.put("paidByMe", true);
    item.put("myShareMinor", 10_000);
    item.put(
        "shares",
        List.of(
            Map.of(
                "name", "Ravi", "shareMinor", 10_000, "personId", "u_ravi", "email", "ravi@x.com"),
            Map.of("name", "Sam", "shareMinor", 10_000, "personId", "u_sam")));
    http()
        .exchange(
            HttpRequest.POST("/api/v1/ingest/split", Map.of("items", List.of(item)))
                .bearerAuth(secret));

    List<Map<String, Object>> people = getList(s.token(), ws(s) + "/split-people");
    assertEquals(2, people.size());
    Map<String, Object> ravi =
        people.stream().filter(p -> "u_ravi".equals(p.get("externalId"))).findFirst().orElseThrow();
    assertEquals("Ravi", ravi.get("label"));
    assertEquals("ravi@x.com", ravi.get("email"));

    // The owner decides Ravi is the "Ravi K" already in their loans; the split app later
    // sends a different spelling and the label stays.
    http()
        .exchange(
            HttpRequest.PUT(ws(s) + "/split-people/" + ravi.get("id"), Map.of("label", "Ravi K"))
                .bearerAuth(s.token()));
    item.put("version", "2");
    item.put(
        "shares",
        List.of(
            Map.of("name", "Ravindra", "shareMinor", 10_000, "personId", "u_ravi"),
            Map.of("name", "Sam", "shareMinor", 10_000, "personId", "u_sam")));
    http()
        .exchange(
            HttpRequest.POST("/api/v1/ingest/split", Map.of("items", List.of(item)))
                .bearerAuth(secret));
    Map<String, Object> after =
        getList(s.token(), ws(s) + "/split-people").stream()
            .filter(p -> "u_ravi".equals(p.get("externalId")))
            .findFirst()
            .orElseThrow();
    assertEquals("Ravindra", after.get("name"));
    assertEquals("Ravi K", after.get("label"));

    String inboxId = (String) getList(s.token(), ws(s) + "/inbox").get(0).get("id");
    post(s.token(), ws(s) + "/inbox/" + inboxId + "/accept", Map.of("accountId", card), Map.class);
    Map<?, ?> loans = get(s.token(), ws(s) + "/loans", Map.class);
    List<String> names =
        ((List<Map<String, Object>>) loans.get("loans"))
            .stream().map(l -> (String) l.get("person")).toList();
    assertTrue(names.contains("Ravi K"), names.toString());
    assertTrue(names.contains("Sam"), names.toString());
  }

  @Test
  void moneyHandedToAFriendBecomesALoan() {
    Session s = register("ident4");
    String secret = connection(s);
    String card =
        (String)
            post(
                    s.token(),
                    ws(s) + "/accounts",
                    Map.of(
                        "name",
                        "Visa",
                        "type",
                        "CHECKING",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        100_000),
                    Map.class)
                .get("id");
    Map<String, Object> item = new HashMap<>();
    item.put("type", "TRANSFER");
    item.put("externalId", "t1");
    item.put("occurredOn", LocalDate.now().toString());
    item.put("currency", "USD");
    item.put("totalMinor", 25_000);
    item.put("direction", "PAID");
    item.put("counterparty", "Ravi");
    item.put("counterpartyId", "u_ravi");
    http()
        .exchange(
            HttpRequest.POST("/api/v1/ingest/split", Map.of("items", List.of(item)))
                .bearerAuth(secret));
    String inboxId = (String) getList(s.token(), ws(s) + "/inbox").get(0).get("id");
    post(s.token(), ws(s) + "/inbox/" + inboxId + "/accept", Map.of("accountId", card), Map.class);

    Map<?, ?> loans = get(s.token(), ws(s) + "/loans", Map.class);
    Map<?, ?> loan = (Map<?, ?>) ((List<?>) loans.get("loans")).get(0);
    assertEquals("LENT", loan.get("direction"));
    assertEquals("Ravi", loan.get("person"));
    assertEquals(
        75_000,
        ((Number) get(s.token(), ws(s) + "/accounts/" + card, Map.class).get("balanceMinor"))
            .longValue());
  }
}

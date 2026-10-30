package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class SplitInboxTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private long num(Object o) {
    return ((Number) o).longValue();
  }

  /** A connection like the one the split app would hold. */
  private String connect(Session s) {
    return (String)
        post(s.token(), ws(s) + "/api-tokens", Map.of("name", "Expense split"), Map.class)
            .get("secret");
  }

  private List<Map<String, Object>> send(String secret, Map<String, Object>... items) {
    Map<?, ?> r =
        http()
            .retrieve(
                HttpRequest.POST("/api/v1/ingest/split", Map.of("items", List.of(items)))
                    .bearerAuth(secret),
                Map.class);
    return (List<Map<String, Object>>) r.get("results");
  }

  private Map<String, Object> expense(
      String id,
      long total,
      boolean paidByMe,
      long mine,
      LocalDate date,
      String group,
      Map<String, Object>... shares) {
    Map<String, Object> m = new HashMap<>();
    m.put("type", "EXPENSE");
    m.put("externalId", id);
    m.put("groupId", "g-" + group);
    m.put("groupName", group);
    m.put("occurredOn", date.toString());
    m.put("currency", "USD");
    m.put("totalMinor", total);
    m.put("title", "Dinner");
    m.put("paidByMe", paidByMe);
    m.put("myShareMinor", mine);
    m.put("shares", List.of(shares));
    return m;
  }

  private Map<String, Object> share(String name, long amount) {
    return Map.of("name", name, "shareMinor", amount);
  }

  private Map<String, Object> settlement(String id, String direction, String who, long amount) {
    return Map.of(
        "type",
        "SETTLEMENT",
        "externalId",
        id,
        "occurredOn",
        LocalDate.now().toString(),
        "currency",
        "USD",
        "totalMinor",
        amount,
        "direction",
        direction,
        "counterparty",
        who,
        "groupName",
        "Lisbon",
        "groupId",
        "g-Lisbon");
  }

  private String card(Session s, long opening) {
    return (String)
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
                    opening),
                Map.class)
            .get("id");
  }

  private long balance(Session s, String id) {
    return num(get(s.token(), ws(s) + "/accounts/" + id, Map.class).get("balanceMinor"));
  }

  private String firstInboxId(Session s) {
    return (String) getList(s.token(), ws(s) + "/inbox").get(0).get("id");
  }

  private void accept(Session s, String id, Map<String, Object> body) {
    post(s.token(), ws(s) + "/inbox/" + id + "/accept", body, Map.class);
  }

  @Test
  void theConnectionIsCheckedAndOnlyValidTokensWork() {
    Session s = register("conn");
    String secret = connect(s);
    Map<?, ?> ping =
        http().retrieve(HttpRequest.GET("/api/v1/ingest/ping").bearerAuth(secret), Map.class);
    assertEquals(true, ping.get("ok"));
    assertEquals("USD", ping.get("currency"));
    assertEquals(HttpStatus.UNAUTHORIZED, statusOf(HttpRequest.GET("/api/v1/ingest/ping")));
    assertEquals(
        HttpStatus.UNAUTHORIZED,
        statusOf(HttpRequest.GET("/api/v1/ingest/ping").bearerAuth("ksk_not-a-real-token")));
    // revoking cuts it off
    String id = (String) getList(s.token(), ws(s) + "/api-tokens").get(0).get("id");
    http().exchange(HttpRequest.DELETE(ws(s) + "/api-tokens/" + id).bearerAuth(s.token()));
    assertEquals(
        HttpStatus.UNAUTHORIZED,
        statusOf(HttpRequest.GET("/api/v1/ingest/ping").bearerAuth(secret)));
  }

  @Test
  void aSharedExpenseYouPaidBecomesYourShareAndLoansToFriends() {
    Session s = register("paid");
    String secret = connect(s);
    String acc = card(s, 100_000);

    var res =
        send(
            secret,
            expense(
                "e1",
                30_000,
                true,
                10_000,
                LocalDate.now(),
                "Lisbon",
                share("Ravi", 10_000),
                share("Sam", 10_000)));
    assertEquals("RECEIVED", res.get(0).get("outcome"));
    assertEquals(
        "UNCHANGED",
        send(
                secret,
                expense(
                    "e1",
                    30_000,
                    true,
                    10_000,
                    LocalDate.now(),
                    "Lisbon",
                    share("Ravi", 10_000),
                    share("Sam", 10_000)))
            .get(0)
            .get("outcome"));
    assertEquals(1, num(get(s.token(), ws(s) + "/inbox/count", Map.class).get("count")));
    assertEquals(100_000, balance(s, acc)); // nothing is recorded until you review it

    accept(s, firstInboxId(s), Map.of("accountId", acc));

    assertEquals(70_000, balance(s, acc)); // the card really was charged 300.00
    assertEquals(
        10_000,
        num(
            get(s.token(), ws(s) + "/dashboard", Map.class)
                .get("expenseMinor"))); // but only your 100.00 counts
    Map<?, ?> loans = get(s.token(), ws(s) + "/loans", Map.class);
    assertEquals(20_000, num(loans.get("owedToMeMinor")));
    assertEquals(2, ((List<?>) loans.get("people")).size());
    Map<?, ?> trip = (Map<?, ?>) getList(s.token(), ws(s) + "/trips").get(0);
    assertEquals("Lisbon", trip.get("name"));
    assertEquals(10_000, num(trip.get("spentMinor")));
    assertEquals(0, num(get(s.token(), ws(s) + "/inbox/count", Map.class).get("count")));
    assertEquals(1, getList(s.token(), ws(s) + "/inbox?scope=done").size());
    // it cannot be accepted twice
    assertEquals(
        HttpStatus.CONFLICT,
        statusOf(
            HttpRequest.POST(
                    ws(s)
                        + "/inbox/"
                        + getList(s.token(), ws(s) + "/inbox?scope=done").get(0).get("id")
                        + "/accept",
                    Map.of("accountId", acc))
                .bearerAuth(s.token())));
  }

  @Test
  void badSharesAreRejectedAndDismissedItemsDisappear() {
    Session s = register("bad");
    String secret = connect(s);
    var res =
        send(
            secret,
            expense("bad1", 30_000, true, 10_000, LocalDate.now(), "Trip", share("Ravi", 5_000)));
    assertEquals("REJECTED", res.get(0).get("outcome"));
    assertTrue(((String) res.get(0).get("message")).contains("must equal totalMinor"));
    send(secret, expense("ok1", 2_000, true, 1_000, LocalDate.now(), "Trip", share("Ravi", 1_000)));
    post(s.token(), ws(s) + "/inbox/" + firstInboxId(s) + "/dismiss", Map.of(), Map.class);
    assertEquals(0, getList(s.token(), ws(s) + "/inbox").size());
  }

  @Test
  void whenAFriendPaidYourShareIsALiabilityUntilYouSettle() {
    Session s = register("fp");
    String secret = connect(s);
    String acc = card(s, 50_000);

    send(
        secret,
        expense(
            "fp1",
            9_000,
            false,
            3_000,
            LocalDate.now(),
            "Flat",
            share("Ben", 3_000),
            share("Cat", 3_000)));
    accept(s, firstInboxId(s), Map.of()); // no account: no money has left yours

    Map<?, ?> owed =
        getList(s.token(), ws(s) + "/accounts").stream()
            .filter(a -> ((String) a.get("name")).startsWith("Owed to friends"))
            .findFirst()
            .orElseThrow();
    assertEquals(-3_000, num(owed.get("balanceMinor")));
    assertEquals(3_000, num(get(s.token(), ws(s) + "/dashboard", Map.class).get("expenseMinor")));
    assertEquals(50_000, balance(s, acc));

    // you pay Ben back 30.00 from the card: the liability clears, and it is not spending again
    send(secret, settlement("s-paid", "PAID", "Ben", 3_000));
    String id = (String) getList(s.token(), ws(s) + "/inbox").get(0).get("id");
    accept(s, id, Map.of("accountId", acc));
    assertEquals(47_000, balance(s, acc));
    assertEquals(
        0,
        num(get(s.token(), ws(s) + "/accounts/" + owed.get("id"), Map.class).get("balanceMinor")));
    assertEquals(3_000, num(get(s.token(), ws(s) + "/dashboard", Map.class).get("expenseMinor")));
  }

  @Test
  void aFriendPayingYouBackRepaysTheirLoanAndIsNotIncome() {
    Session s = register("rb");
    String secret = connect(s);
    String acc = card(s, 100_000);
    send(
        secret,
        expense("rb1", 20_000, true, 10_000, LocalDate.now(), "Lisbon", share("Ravi", 10_000)));
    accept(s, firstInboxId(s), Map.of("accountId", acc));

    // paying back more than they owe waits for the related expenses
    send(secret, settlement("rb-big", "RECEIVED", "Ravi", 15_000));
    assertEquals(
        HttpStatus.UNPROCESSABLE_ENTITY,
        statusOf(
            HttpRequest.POST(
                    ws(s) + "/inbox/" + firstInboxId(s) + "/accept", Map.of("accountId", acc))
                .bearerAuth(s.token())));
    post(s.token(), ws(s) + "/inbox/" + firstInboxId(s) + "/dismiss", Map.of(), Map.class);

    send(secret, settlement("rb-ok", "RECEIVED", "Ravi", 10_000));
    accept(s, firstInboxId(s), Map.of("accountId", acc));
    assertEquals(90_000, balance(s, acc)); // 100,000 - 20,000 + 10,000
    assertEquals(0, num(get(s.token(), ws(s) + "/loans", Map.class).get("owedToMeMinor")));
    assertEquals(0, num(get(s.token(), ws(s) + "/dashboard", Map.class).get("incomeMinor")));
  }

  @Test
  void aChangeInTheSplitAppIsAppliedOnlyWhenYouAgree() {
    Session s = register("chg");
    String secret = connect(s);
    String acc = card(s, 100_000);
    send(
        secret,
        expense(
            "c1",
            30_000,
            true,
            10_000,
            LocalDate.now(),
            "Lisbon",
            share("Ravi", 10_000),
            share("Sam", 10_000)));
    accept(s, firstInboxId(s), Map.of("accountId", acc));

    // the amounts were corrected in the split app
    var res =
        send(
            secret,
            expense(
                "c1",
                36_000,
                true,
                12_000,
                LocalDate.now(),
                "Lisbon",
                share("Ravi", 12_000),
                share("Sam", 12_000)));
    assertEquals("UPDATED", res.get(0).get("outcome"));
    assertEquals(70_000, balance(s, acc)); // Keeper still has the old version
    assertEquals("CHANGED", getList(s.token(), ws(s) + "/inbox").get(0).get("status"));

    post(s.token(), ws(s) + "/inbox/" + firstInboxId(s) + "/apply-update", Map.of(), Map.class);
    assertEquals(64_000, balance(s, acc));
    assertEquals(12_000, num(get(s.token(), ws(s) + "/dashboard", Map.class).get("expenseMinor")));
    assertEquals(24_000, num(get(s.token(), ws(s) + "/loans", Map.class).get("owedToMeMinor")));
    assertEquals(0, getList(s.token(), ws(s) + "/inbox").size());
  }

  @Test
  void anItemDeletedInTheSplitAppCanBeRemovedFromKeeper() {
    Session s = register("del");
    String secret = connect(s);
    String acc = card(s, 100_000);
    send(
        secret,
        expense("d1", 20_000, true, 10_000, LocalDate.now(), "Lisbon", share("Ravi", 10_000)));
    accept(s, firstInboxId(s), Map.of("accountId", acc));
    assertEquals(
        "REMOVED",
        send(
                secret,
                Map.of(
                    "type",
                    "EXPENSE",
                    "externalId",
                    "d1",
                    "occurredOn",
                    LocalDate.now().toString(),
                    "currency",
                    "USD",
                    "deleted",
                    true))
            .get(0)
            .get("outcome"));
    assertEquals("REMOVED", getList(s.token(), ws(s) + "/inbox").get(0).get("status"));
    assertEquals(80_000, balance(s, acc)); // nothing changes until you decide

    post(s.token(), ws(s) + "/inbox/" + firstInboxId(s) + "/remove-records", Map.of(), Map.class);
    assertEquals(100_000, balance(s, acc));
    assertEquals(0, num(get(s.token(), ws(s) + "/loans", Map.class).get("owedToMeMinor")));
    assertEquals(0, num(get(s.token(), ws(s) + "/dashboard", Map.class).get("expenseMinor")));
  }

  @Test
  void expensesFromTheSameGroupLandOnOneTripThatGrowsWithThem() {
    Session s = register("grp");
    String secret = connect(s);
    String acc = card(s, 100_000);
    send(
        secret,
        expense(
            "g1", 2_000, true, 1_000, LocalDate.now().minusDays(5), "Goa", share("Ravi", 1_000)));
    accept(s, firstInboxId(s), Map.of("accountId", acc));
    send(secret, expense("g2", 4_000, true, 2_000, LocalDate.now(), "Goa", share("Ravi", 2_000)));
    accept(s, firstInboxId(s), Map.of("accountId", acc));
    List<Map<String, Object>> trips = getList(s.token(), ws(s) + "/trips");
    assertEquals(1, trips.size());
    assertEquals(3_000, num(trips.get(0).get("spentMinor")));
    assertEquals(LocalDate.now().minusDays(5).toString(), trips.get(0).get("startDate"));
    assertEquals(6, num(trips.get(0).get("totalDays")));
  }
}

package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class HouseholdTest extends ApiTestBase {

  private String ws(String id) {
    return "/api/v1/workspaces/" + id;
  }

  private long num(Object o) {
    return ((Number) o).longValue();
  }

  @Test
  void sharedExpensesFollowTheirSourceAndBalancesSettle() {
    Session alice = register("alice");
    Session bob = register("bob");

    // alice creates a household and invites bob as an editor
    Map<?, ?> hh =
        post(
            alice.token(),
            "/api/v1/workspaces",
            Map.of("name", "Home", "currency", "USD", "kind", "SHARED"),
            Map.class);
    String hhId = (String) hh.get("id");
    assertEquals("SHARED", hh.get("kind"));
    String invite =
        (String)
            post(alice.token(), ws(hhId) + "/invites", Map.of("role", "EDITOR"), Map.class)
                .get("token");
    post(bob.token(), "/api/v1/invites/" + invite + "/accept", Map.of(), Map.class);

    // alice spends 60.00 in her personal ledger and shares it
    String acc =
        (String)
            post(
                    alice.token(),
                    ws(alice.workspaceId().toString()) + "/accounts",
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
    String groceries =
        (String)
            getList(alice.token(), ws(alice.workspaceId().toString()) + "/categories").stream()
                .filter(c -> "Groceries".equals(c.get("name")))
                .findFirst()
                .orElseThrow()
                .get("id");
    String personal = ws(alice.workspaceId().toString());
    Map<?, ?> tx =
        post(
            alice.token(),
            personal + "/transactions",
            Map.of(
                "accountId",
                acc,
                "type",
                "EXPENSE",
                "amountMinor",
                6_000,
                "occurredOn",
                LocalDate.now().toString(),
                "categoryId",
                groceries,
                "note",
                "weekly shop"),
            Map.class);
    Map<?, ?> shared =
        post(
            alice.token(),
            personal + "/transactions/" + tx.get("id") + "/share",
            Map.of("householdId", hhId),
            Map.class);
    assertTrue(shared.get("sharedGroupId") != null);
    // sharing twice is a conflict
    assertEquals(
        HttpStatus.CONFLICT,
        statusOf(
            HttpRequest.POST(
                    personal + "/transactions/" + tx.get("id") + "/share",
                    Map.of("householdId", hhId))
                .bearerAuth(alice.token())));

    // a household is view-only: nobody can type entries into it directly, not even an editor
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.POST(
                    ws(hhId) + "/accounts",
                    Map.of(
                        "name",
                        "Nope",
                        "type",
                        "CASH",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        0))
                .bearerAuth(alice.token())));
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.POST(
                    ws(hhId) + "/transactions",
                    Map.of(
                        "accountId",
                        UUID.randomUUID().toString(),
                        "type",
                        "EXPENSE",
                        "amountMinor",
                        100,
                        "occurredOn",
                        LocalDate.now().toString()))
                .bearerAuth(bob.token())));

    // bob (a read-only member) records 20.00 in HIS ledger and shares it
    String bobPersonal = ws(bob.workspaceId().toString());
    String bobAcc =
        (String)
            post(
                    bob.token(),
                    bobPersonal + "/accounts",
                    Map.of(
                        "name",
                        "Bob cash",
                        "type",
                        "CASH",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        50_000),
                    Map.class)
                .get("id");
    Map<?, ?> bobTx =
        post(
            bob.token(),
            bobPersonal + "/transactions",
            Map.of(
                "accountId",
                bobAcc,
                "type",
                "EXPENSE",
                "amountMinor",
                2_000,
                "occurredOn",
                LocalDate.now().toString()),
            Map.class);
    post(
        bob.token(),
        bobPersonal + "/transactions/" + bobTx.get("id") + "/share",
        Map.of("householdId", hhId),
        Map.class);

    Map<?, ?> sum = get(bob.token(), ws(hhId) + "/household/summary", Map.class);
    assertEquals(8_000, num(sum.get("totalMinor")));
    List<?> balances = (List<?>) sum.get("balances");
    Map<?, ?> aliceBal =
        balances.stream()
            .map(b -> (Map<?, ?>) b)
            .filter(b -> alice.userId().toString().equals(b.get("userId")))
            .findFirst()
            .orElseThrow();
    assertEquals(6_000, num(aliceBal.get("paidMinor")));
    assertEquals(2_000, num(aliceBal.get("balanceMinor"))); // alice is owed 20.00
    List<?> suggested = (List<?>) sum.get("suggested");
    assertEquals(1, suggested.size());
    assertEquals(bob.userId().toString(), ((Map<?, ?>) suggested.get(0)).get("fromUserId"));
    assertEquals(2_000, num(((Map<?, ?>) suggested.get(0)).get("amountMinor")));
    // categories show who spent what
    assertTrue(((List<?>) sum.get("categories")).size() >= 1);

    // the copy cannot be edited from the household side
    Map<?, ?> copy =
        ((List<?>) get(bob.token(), ws(hhId) + "/transactions", Map.class).get("items"))
            .stream()
                .map(i -> (Map<?, ?>) i)
                .filter(i -> Boolean.TRUE.equals(i.get("sharedCopy")))
                .findFirst()
                .orElseThrow();
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.DELETE(ws(hhId) + "/transactions/" + copy.get("id"))
                .bearerAuth(bob.token())));

    // read-only members can still comment on a shared expense
    post(
        bob.token(),
        ws(hhId) + "/transactions/" + copy.get("id") + "/comments",
        Map.of("body", "thanks!"),
        Map.class);

    // bob settles up: balances clear
    post(
        bob.token(),
        ws(hhId) + "/household/settlements",
        Map.of(
            "toUserId",
            alice.userId().toString(),
            "amountMinor",
            2_000,
            "occurredOn",
            LocalDate.now().toString()),
        Map.class);
    Map<?, ?> after = get(alice.token(), ws(hhId) + "/household/summary", Map.class);
    assertTrue(((List<?>) after.get("suggested")).isEmpty());

    // editing the personal expense updates the copy
    put(
        alice.token(),
        personal + "/transactions/" + tx.get("id"),
        Map.of(
            "expectedVersion",
            shared.get("version"),
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            7_000,
            "occurredOn",
            LocalDate.now().toString(),
            "categoryId",
            groceries),
        Map.class);
    assertEquals(
        9_000,
        num(get(alice.token(), ws(hhId) + "/household/summary", Map.class).get("totalMinor")));

    // deleting it removes the copy; undoing brings both back
    http()
        .exchange(
            HttpRequest.DELETE(personal + "/transactions/" + tx.get("id"))
                .bearerAuth(alice.token()));
    assertEquals(
        2_000,
        num(get(alice.token(), ws(hhId) + "/household/summary", Map.class).get("totalMinor")));
    post(alice.token(), personal + "/transactions/" + tx.get("id") + "/undo", Map.of(), Map.class);
    assertEquals(
        9_000,
        num(get(alice.token(), ws(hhId) + "/household/summary", Map.class).get("totalMinor")));
  }

  @Test
  void onlyHouseholdMembersCanBeSharedWith() {
    Session alice = register("a2");
    Session stranger = register("s2");
    String hhId =
        (String)
            post(
                    stranger.token(),
                    "/api/v1/workspaces",
                    Map.of("name", "Theirs", "currency", "USD", "kind", "SHARED"),
                    Map.class)
                .get("id");
    String personal = ws(alice.workspaceId().toString());
    String acc =
        (String)
            post(
                    alice.token(),
                    personal + "/accounts",
                    Map.of(
                        "name",
                        "Card",
                        "type",
                        "CHECKING",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        0),
                    Map.class)
                .get("id");
    Map<?, ?> tx =
        post(
            alice.token(),
            personal + "/transactions",
            Map.of(
                "accountId",
                acc,
                "type",
                "EXPENSE",
                "amountMinor",
                100,
                "occurredOn",
                LocalDate.now().toString()),
            Map.class);
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.POST(
                    personal + "/transactions/" + tx.get("id") + "/share",
                    Map.of("householdId", hhId))
                .bearerAuth(alice.token())));
  }

  private String spendAndShare(Session who, long amount, String sharedLedger) {
    String personal = ws(who.workspaceId().toString());
    String acc =
        (String)
            getList(who.token(), personal + "/accounts").stream()
                .findFirst()
                .map(a -> a.get("id"))
                .orElseGet(
                    () ->
                        post(
                                who.token(),
                                personal + "/accounts",
                                Map.of(
                                    "name",
                                    "Card",
                                    "type",
                                    "CHECKING",
                                    "currency",
                                    "USD",
                                    "openingBalanceMinor",
                                    1_000_000),
                                Map.class)
                            .get("id"))
                .toString();
    Map<?, ?> tx =
        post(
            who.token(),
            personal + "/transactions",
            Map.of(
                "accountId",
                acc,
                "type",
                "EXPENSE",
                "amountMinor",
                amount,
                "occurredOn",
                LocalDate.now().toString()),
            Map.class);
    post(
        who.token(),
        personal + "/transactions/" + tx.get("id") + "/share",
        Map.of("householdId", sharedLedger),
        Map.class);
    return (String) tx.get("id");
  }

  @Test
  void friendsOnATripEachShareAndSeeOneCombinedPicture() {
    Session ann = register("ann");
    Session ben = register("ben");
    Session cat = register("cat");

    // ann creates two shared ledgers; a person is in as many as they like, with their one personal
    // ledger
    String trip =
        (String)
            post(
                    ann.token(),
                    "/api/v1/workspaces",
                    Map.of("name", "Lisbon", "currency", "USD", "kind", "SHARED"),
                    Map.class)
                .get("id");
    String flat =
        (String)
            post(
                    ann.token(),
                    "/api/v1/workspaces",
                    Map.of("name", "Flat", "currency", "USD", "kind", "SHARED"),
                    Map.class)
                .get("id");
    for (Session friend : List.of(ben, cat)) {
      String token =
          (String)
              post(ann.token(), ws(trip) + "/invites", Map.of("role", "VIEWER"), Map.class)
                  .get("token");
      post(friend.token(), "/api/v1/invites/" + token + "/accept", Map.of(), Map.class);
    }
    String flatToken =
        (String)
            post(ann.token(), ws(flat) + "/invites", Map.of("role", "VIEWER"), Map.class)
                .get("token");
    post(ben.token(), "/api/v1/invites/" + flatToken + "/accept", Map.of(), Map.class);

    spendAndShare(ann, 9_000, trip); // ann paid for the hotel
    spendAndShare(ben, 3_000, trip); // ben paid for dinner
    spendAndShare(ben, 50_000, flat); // a different group entirely

    Map<?, ?> tripSummary = get(cat.token(), ws(trip) + "/household/summary", Map.class);
    assertEquals(12_000, num(tripSummary.get("totalMinor")));
    Map<?, ?> catBalance =
        ((List<?>) tripSummary.get("balances"))
            .stream()
                .map(b -> (Map<?, ?>) b)
                .filter(b -> cat.userId().toString().equals(b.get("userId")))
                .findFirst()
                .orElseThrow();
    assertEquals(
        -4_000, num(catBalance.get("balanceMinor"))); // cat paid nothing, owes a third of 12,000
    assertEquals(2, ((List<?>) tripSummary.get("suggested")).size()); // cat pays ann and ben

    // the flat ledger only has what was shared to it
    assertEquals(
        50_000,
        num(get(ben.token(), ws(flat) + "/household/summary", Map.class).get("totalMinor")));
    // cat is not in the flat
    assertEquals(
        HttpStatus.NOT_FOUND,
        statusOf(HttpRequest.GET(ws(flat) + "/household/summary").bearerAuth(cat.token())));
  }
}

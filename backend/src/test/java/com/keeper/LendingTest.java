package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micronaut.http.HttpRequest;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class LendingTest extends ApiTestBase {

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private long num(Object o) {
    return ((Number) o).longValue();
  }

  private String emailOf(Session s) {
    return (String) ((Map<?, ?>) get(s.token(), "/api/v1/me", Map.class).get("user")).get("email");
  }

  private String foodCategory(Session s) {
    return (String)
        getList(s.token(), ws(s) + "/categories").stream()
            .filter(c -> "EXPENSE".equals(c.get("kind")) && c.get("parentId") == null)
            .findFirst()
            .orElseThrow()
            .get("id");
  }

  private long balance(Session s, String accountId) {
    return num(get(s.token(), ws(s) + "/accounts/" + accountId, Map.class).get("balanceMinor"));
  }

  private String spend(Session s, String account, long amount) {
    return (String)
        post(
                s.token(),
                ws(s) + "/transactions",
                Map.of(
                    "accountId",
                    account,
                    "type",
                    "EXPENSE",
                    "amountMinor",
                    amount,
                    "occurredOn",
                    LocalDate.now().toString(),
                    "categoryId",
                    foodCategory(s)),
                Map.class)
            .get("id");
  }

  /** Owner lends a card to a guest, who accepts; returns {ownerCard, guestMemoAccount}. */
  private String[] lend(Session owner, Session guest) {
    String card =
        (String)
            post(
                    owner.token(),
                    ws(owner) + "/accounts",
                    Map.of(
                        "name",
                        "Card",
                        "type",
                        "CREDIT_CARD",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        1_000_000),
                    Map.class)
                .get("id");
    post(
        owner.token(),
        ws(owner) + "/accounts/" + card + "/shares",
        Map.of("email", emailOf(guest)),
        Map.class);
    List<Map<String, Object>> invites = getList(guest.token(), "/api/v1/lending/invitations");
    assertEquals(1, invites.size());
    Map<?, ?> memo =
        post(
            guest.token(),
            "/api/v1/lending/invitations/" + invites.get(0).get("id") + "/accept",
            Map.of(),
            Map.class);
    assertEquals(true, memo.get("memo"));
    return new String[] {card, (String) memo.get("id")};
  }

  @Test
  void whatTheGuestSpendsLandsInBothLedgersAndStaysInSync() {
    Session owner = register("owner");
    Session guest = register("guest");
    String[] ids = lend(owner, guest);

    String mine = spend(owner, ids[0], 20_000);
    String hers = spend(guest, ids[1], 50_000);
    assertEquals(1_000_000 - 70_000, balance(owner, ids[0]));

    // Owner sees it as spending by the guest, kept out of their own totals.
    Map<?, ?> ownerDash = get(owner.token(), ws(owner) + "/dashboard", Map.class);
    assertEquals(20_000, num(ownerDash.get("expenseMinor")));
    List<?> others = (List<?>) ownerDash.get("spentByOthers");
    assertEquals(1, others.size());
    assertEquals("guest", ((Map<?, ?>) others.get(0)).get("name"));
    assertEquals(50_000, num(((Map<?, ?>) others.get(0)).get("expenseMinor")));

    // The guest sees her own spending, and the lent card is not part of her net worth.
    Map<?, ?> guestDash = get(guest.token(), ws(guest) + "/dashboard", Map.class);
    assertEquals(50_000, num(guestDash.get("expenseMinor")));
    assertEquals(0, num(guestDash.get("netWorthMinor")));

    // Editing, deleting and restoring her entry follows through to the owner's card.
    Map<String, Object> edit = new java.util.HashMap<>();
    edit.put("accountId", ids[1]);
    edit.put("type", "EXPENSE");
    edit.put("amountMinor", 40_000);
    edit.put("occurredOn", LocalDate.now().toString());
    put(guest.token(), ws(guest) + "/transactions/" + hers, edit, Map.class);
    assertEquals(1_000_000 - 60_000, balance(owner, ids[0]));

    http()
        .exchange(
            HttpRequest.DELETE(ws(guest) + "/transactions/" + hers).bearerAuth(guest.token()));
    assertEquals(1_000_000 - 20_000, balance(owner, ids[0]));
    post(guest.token(), ws(guest) + "/transactions/" + hers + "/restore", Map.of(), Map.class);
    assertEquals(1_000_000 - 60_000, balance(owner, ids[0]));
    assertEquals(mine.isEmpty(), false);
  }

  @Test
  void aLentAccountOnlyTakesSpendingAndStopsWhenRevoked() {
    Session owner = register("owner2");
    Session guest = register("guest2");
    String[] ids = lend(owner, guest);

    var income =
        exchange(
            HttpRequest.POST(
                    ws(guest) + "/transactions",
                    Map.of(
                        "accountId",
                        ids[1],
                        "type",
                        "INCOME",
                        "amountMinor",
                        100,
                        "occurredOn",
                        LocalDate.now().toString()))
                .bearerAuth(guest.token()));
    assertEquals(400, income.getStatus().getCode());

    Map<?, ?> share =
        (Map<?, ?>) getList(owner.token(), ws(owner) + "/accounts/" + ids[0] + "/shares").get(0);
    http()
        .exchange(
            HttpRequest.DELETE(ws(owner) + "/shares/" + share.get("id")).bearerAuth(owner.token()));

    var after =
        exchange(
            HttpRequest.POST(
                    ws(guest) + "/transactions",
                    Map.of(
                        "accountId",
                        ids[1],
                        "type",
                        "EXPENSE",
                        "amountMinor",
                        100,
                        "occurredOn",
                        LocalDate.now().toString()))
                .bearerAuth(guest.token()));
    assertTrue(after.getStatus().getCode() >= 400);
    assertEquals(1_000_000, balance(owner, ids[0]));
  }

  @Test
  void onlyTheInvitedPersonCanAccept() {
    Session owner = register("owner3");
    Session guest = register("guest3");
    Session stranger = register("stranger3");
    String card =
        (String)
            post(
                    owner.token(),
                    ws(owner) + "/accounts",
                    Map.of(
                        "name",
                        "Card",
                        "type",
                        "CREDIT_CARD",
                        "currency",
                        "USD",
                        "openingBalanceMinor",
                        0),
                    Map.class)
                .get("id");
    post(
        owner.token(),
        ws(owner) + "/accounts/" + card + "/shares",
        Map.of("email", emailOf(guest)),
        Map.class);
    String inviteId =
        (String) getList(guest.token(), "/api/v1/lending/invitations").get(0).get("id");
    assertEquals(0, getList(stranger.token(), "/api/v1/lending/invitations").size());
    var res =
        exchange(
            HttpRequest.POST("/api/v1/lending/invitations/" + inviteId + "/accept", Map.of())
                .bearerAuth(stranger.token()));
    assertEquals(404, res.getStatus().getCode());
  }
}

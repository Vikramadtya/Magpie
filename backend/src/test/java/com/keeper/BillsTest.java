package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class BillsTest extends ApiTestBase {

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
                    0),
                Map.class)
            .get("id");
  }

  @Test
  void aTrackedBillShowsAsDueOnItsDateInTheCalendar() {
    Session s = register("bills");
    String acc = account(s);
    LocalDate due = LocalDate.now().plusDays(3);
    post(
        s.token(),
        ws(s) + "/recurring",
        new HashMap<>(
            Map.of(
                "name",
                "Broadband",
                "accountId",
                acc,
                "type",
                "EXPENSE",
                "amountMinor",
                4_900,
                "currency",
                "USD",
                "frequency",
                "MONTHLY",
                "intervalN",
                1,
                "startOn",
                due.toString(),
                "autoPost",
                false)),
        Map.class);

    Map<?, ?> calendar =
        get(s.token(), ws(s) + "/bills/calendar?month=" + YearMonth.from(due), Map.class);
    @SuppressWarnings("unchecked")
    var items = (List<Map<String, Object>>) calendar.get("items");
    var bill =
        items.stream().filter(i -> "Broadband".equals(i.get("name"))).findFirst().orElseThrow();
    assertEquals(due.toString(), bill.get("date"));
    assertEquals("DUE", bill.get("status"));
    assertEquals(4_900, ((Number) bill.get("amountMinor")).intValue());
  }

  @Test
  void aChargeThatRepeatsIsSpottedBeforeItIsTrackedAndNotAfter() {
    Session s = register("spotted");
    String acc = account(s);
    String payee =
        (String)
            post(s.token(), ws(s) + "/payees", Map.of("name", "Streamly"), Map.class).get("id");
    for (int i = 4; i >= 1; i--) {
      post(
          s.token(),
          ws(s) + "/transactions",
          new HashMap<>(
              Map.of(
                  "accountId",
                  acc,
                  "type",
                  "EXPENSE",
                  "amountMinor",
                  999,
                  "occurredOn",
                  LocalDate.now().minusDays(30L * i - 10).toString(),
                  "payeeId",
                  payee)),
          Map.class);
    }
    var found = getList(s.token(), ws(s) + "/bills/suggestions");
    assertEquals(1, found.size());
    assertEquals("Streamly", found.get(0).get("payee"));
    assertEquals("MONTHLY", found.get(0).get("frequency"));
    assertEquals(payee, found.get(0).get("payeeId"));

    // once it is a recurring item it is no longer a suggestion
    post(
        s.token(),
        ws(s) + "/recurring",
        new HashMap<>(
            Map.of(
                "name",
                "Streamly",
                "accountId",
                acc,
                "payeeId",
                payee,
                "type",
                "EXPENSE",
                "amountMinor",
                999,
                "currency",
                "USD",
                "frequency",
                "MONTHLY",
                "intervalN",
                1,
                "startOn",
                LocalDate.now().plusDays(20).toString(),
                "autoPost",
                false)),
        Map.class);
    assertTrue(getList(s.token(), ws(s) + "/bills/suggestions").isEmpty());
  }
}

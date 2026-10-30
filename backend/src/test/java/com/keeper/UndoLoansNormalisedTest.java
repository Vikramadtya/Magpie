package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import jakarta.inject.Inject;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class UndoLoansNormalisedTest extends ApiTestBase {

  @Inject Db db;
  @Inject FxConverter fx;

  @BeforeEach
  void rates() {
    db.update("DELETE FROM exchange_rates");
    db.update(
        "INSERT INTO exchange_rates(base, quote, rate, as_of) VALUES ('USD','EUR',?,?)",
        new BigDecimal("0.90"),
        LocalDate.now());
    fx.invalidate();
  }

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String account(Session s, String currency, long opening) {
    return (String)
        post(
                s.token(),
                ws(s) + "/accounts",
                Map.of(
                    "name",
                    currency + " acct",
                    "type",
                    "CHECKING",
                    "currency",
                    currency,
                    "openingBalanceMinor",
                    opening),
                Map.class)
            .get("id");
  }

  private long balance(Session s, String id) {
    return ((Number) get(s.token(), ws(s) + "/accounts/" + id, Map.class).get("balanceMinor"))
        .longValue();
  }

  private Map<?, ?> expense(Session s, String acc, long amount) {
    return post(
        s.token(),
        ws(s) + "/transactions",
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
  }

  // ---------- undo ----------

  @Test
  void undoBringsADeletedTransactionBack() {
    Session s = register("ud");
    String acc = account(s, "USD", 100_000);
    Map<?, ?> tx = expense(s, acc, 10_000);
    http()
        .exchange(
            HttpRequest.DELETE(ws(s) + "/transactions/" + tx.get("id")).bearerAuth(s.token()));
    assertEquals(100_000, balance(s, acc));
    assertEquals(1, getList(s.token(), ws(s) + "/transactions/deleted").size());

    Map<?, ?> r =
        post(s.token(), ws(s) + "/transactions/" + tx.get("id") + "/undo", Map.of(), Map.class);
    assertEquals("RESTORED", r.get("action"));
    assertEquals(90_000, balance(s, acc));
    assertEquals(0, getList(s.token(), ws(s) + "/transactions/deleted").size());
    // nothing left to undo
    assertEquals(
        HttpStatus.NOT_FOUND,
        statusOf(
            HttpRequest.POST(ws(s) + "/transactions/" + tx.get("id") + "/undo", Map.of())
                .bearerAuth(s.token())));
  }

  @Test
  void undoRevertsAnEdit() {
    Session s = register("ue");
    String acc = account(s, "USD", 100_000);
    Map<?, ?> tx = expense(s, acc, 10_000);
    put(
        s.token(),
        ws(s) + "/transactions/" + tx.get("id"),
        Map.of(
            "expectedVersion",
            tx.get("version"),
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            30_000,
            "occurredOn",
            LocalDate.now().toString()),
        Map.class);
    assertEquals(70_000, balance(s, acc));
    Map<?, ?> r =
        post(s.token(), ws(s) + "/transactions/" + tx.get("id") + "/undo", Map.of(), Map.class);
    assertEquals("REVERTED", r.get("action"));
    assertEquals(90_000, balance(s, acc));
    assertEquals(
        10_000, ((Number) ((Map<?, ?>) r.get("transaction")).get("amountMinor")).intValue());
  }

  @Test
  void undoingADeletedTransferRestoresBothLegs() {
    Session s = register("ut");
    String a = account(s, "USD", 50_000);
    String b = account(s, "USD", 0);
    List<Map<String, Object>> legs =
        postList(
            s.token(),
            ws(s) + "/transfers",
            Map.of(
                "fromAccountId",
                a,
                "toAccountId",
                b,
                "amountMinor",
                12_000,
                "occurredOn",
                LocalDate.now().toString()));
    String leg = (String) legs.get(0).get("id");
    http().exchange(HttpRequest.DELETE(ws(s) + "/transactions/" + leg).bearerAuth(s.token()));
    assertEquals(50_000, balance(s, a));
    post(s.token(), ws(s) + "/transactions/" + leg + "/undo", Map.of(), Map.class);
    assertEquals(38_000, balance(s, a));
    assertEquals(12_000, balance(s, b));
  }

  // ---------- loans ----------

  @Test
  void borrowingLendingAndRepaying() {
    Session s = register("ln");
    String acc = account(s, "USD", 500_000);
    Map<?, ?> loan =
        post(
            s.token(),
            ws(s) + "/loans",
            Map.of(
                "person",
                "Ravi",
                "direction",
                "BORROWED",
                "accountId",
                acc,
                "amountMinor",
                100_000,
                "occurredOn",
                LocalDate.now().toString()),
            Map.class);
    assertEquals(600_000, balance(s, acc));

    post(
        s.token(),
        ws(s) + "/loans/" + loan.get("id") + "/payments",
        Map.of("accountId", acc, "amountMinor", 40_000, "occurredOn", LocalDate.now().toString()),
        Map.class);
    assertEquals(560_000, balance(s, acc));

    // cannot repay more than is outstanding
    assertEquals(
        HttpStatus.UNPROCESSABLE_ENTITY,
        statusOf(
            HttpRequest.POST(
                    ws(s) + "/loans/" + loan.get("id") + "/payments",
                    Map.of(
                        "accountId",
                        acc,
                        "amountMinor",
                        70_000,
                        "occurredOn",
                        LocalDate.now().toString()))
                .bearerAuth(s.token())));

    post(
        s.token(),
        ws(s) + "/loans",
        Map.of(
            "person",
            "Sam",
            "direction",
            "LENT",
            "accountId",
            acc,
            "amountMinor",
            20_000,
            "occurredOn",
            LocalDate.now().toString()),
        Map.class);

    Map<?, ?> overview = get(s.token(), ws(s) + "/loans", Map.class);
    assertEquals(60_000, ((Number) overview.get("iOweMinor")).intValue());
    assertEquals(20_000, ((Number) overview.get("owedToMeMinor")).intValue());
    assertEquals(2, ((List<?>) overview.get("people")).size());

    // loans are not income or spending
    Map<?, ?> dash = get(s.token(), ws(s) + "/dashboard", Map.class);
    assertEquals(0, ((Number) dash.get("incomeMinor")).intValue());
    assertEquals(0, ((Number) dash.get("expenseMinor")).intValue());

    // deleting the loan puts the money back
    http().exchange(HttpRequest.DELETE(ws(s) + "/loans/" + loan.get("id")).bearerAuth(s.token()));
    assertEquals(480_000, balance(s, acc)); // 500k - 20k lent
  }

  // ---------- normalised amounts ----------

  @Test
  void baseAmountUsesTheDaysRateAndCanBeOverridden() {
    Session s = register("nm");
    String eur = account(s, "EUR", 0);
    String today = LocalDate.now().toString();
    Map<?, ?> tx =
        post(
            s.token(),
            ws(s) + "/transactions",
            Map.of("accountId", eur, "type", "EXPENSE", "amountMinor", 9_000, "occurredOn", today),
            Map.class);
    // 90.00 EUR at 0.90 EUR per USD = 100.00 USD
    assertEquals(10_000, ((Number) tx.get("baseAmountMinor")).intValue());
    assertEquals("USD", tx.get("baseCurrency"));
    assertFalse((Boolean) tx.get("baseOverridden"));

    Map<?, ?> set =
        put(
            s.token(),
            ws(s) + "/transactions/" + tx.get("id") + "/normalized",
            Map.of("baseAmountMinor", 9_500),
            Map.class);
    assertEquals(9_500, ((Number) set.get("baseAmountMinor")).intValue());
    assertTrue((Boolean) set.get("baseOverridden"));
    assertEquals(
        9_500,
        ((Number) get(s.token(), ws(s) + "/dashboard", Map.class).get("expenseMinor")).intValue());

    // editing the note keeps the hand-set value; reset returns to the day's rate
    Map<?, ?> edited =
        put(
            s.token(),
            ws(s) + "/transactions/" + tx.get("id"),
            Map.of(
                "accountId",
                eur,
                "type",
                "EXPENSE",
                "amountMinor",
                9_000,
                "occurredOn",
                today,
                "note",
                "x"),
            Map.class);
    assertTrue((Boolean) edited.get("baseOverridden"));
    Map<?, ?> reset =
        http()
            .retrieve(
                HttpRequest.DELETE(ws(s) + "/transactions/" + tx.get("id") + "/normalized")
                    .bearerAuth(s.token()),
                Map.class);
    assertEquals(10_000, ((Number) reset.get("baseAmountMinor")).intValue());
    assertFalse((Boolean) reset.get("baseOverridden"));
  }
}

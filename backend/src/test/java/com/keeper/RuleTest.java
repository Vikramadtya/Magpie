package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.rule.RuleService;
import com.keeper.rule.RuleService.Def;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RuleTest extends ApiTestBase {

  private static Def def(String text, String op, String amountOp, Long min, Long max, String type) {
    return new Def(text, op, amountOp, min, max, type, UUID.randomUUID());
  }

  @Test
  void textAndAmountConditionsAreCombinedAndCaseInsensitive() {
    var swiggy = def("swiggy, zomato", "CONTAINS", null, null, null, null);
    assertTrue(RuleService.matches(swiggy, "SWIGGY Instamart", null, 500, "EXPENSE"));
    assertTrue(
        RuleService.matches(
            swiggy, null, "dinner on Zomato", 500, "EXPENSE")); // the note counts too
    assertFalse(RuleService.matches(swiggy, "Uber", "ride", 500, "EXPENSE"));

    assertTrue(
        RuleService.matches(
            def("netflix", "STARTS_WITH", null, null, null, null),
            "Netflix India",
            null,
            1,
            "EXPENSE"));
    assertFalse(
        RuleService.matches(
            def("netflix", "STARTS_WITH", null, null, null, null),
            "My Netflix",
            null,
            1,
            "EXPENSE"));
    assertTrue(
        RuleService.matches(
            def("rent", "EQUALS", null, null, null, null), "Rent", null, 1, "EXPENSE"));
    assertFalse(
        RuleService.matches(
            def("rent", "EQUALS", null, null, null, null), "Rent paid", null, 1, "EXPENSE"));

    var big = def(null, "CONTAINS", "GT", 100_000L, null, "EXPENSE");
    assertTrue(RuleService.matches(big, null, null, 100_001, "EXPENSE"));
    assertFalse(RuleService.matches(big, null, null, 100_000, "EXPENSE")); // strictly more than
    assertFalse(RuleService.matches(big, null, null, 500_000, "INCOME")); // wrong kind
    var band = def("cafe", "CONTAINS", "BETWEEN", 100L, 500L, null);
    assertTrue(RuleService.matches(band, "Blue Cafe", null, 300, "EXPENSE"));
    assertFalse(
        RuleService.matches(
            band, "Blue Cafe", null, 900, "EXPENSE")); // the words match, the amount does not
  }

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  @Test
  void aRuleFilesNewEntriesAndPastOnesAndLeavesCategorisedAlone() {
    Session s = register("rules-engine");
    String acc =
        (String)
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
    String food =
        (String)
            post(
                    s.token(),
                    ws(s) + "/categories",
                    Map.of("name", "Food Rule", "kind", "EXPENSE"),
                    Map.class)
                .get("id");
    String other =
        (String)
            post(
                    s.token(),
                    ws(s) + "/categories",
                    Map.of("name", "Other Rule", "kind", "EXPENSE"),
                    Map.class)
                .get("id");
    String today = LocalDate.now().toString();

    // an old entry with a note that mentions the merchant (notes are encrypted at rest)
    Map<?, ?> old =
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
                    700,
                    "occurredOn",
                    today,
                    "note",
                    "lunch at ZOMATO")),
            Map.class);
    Map<?, ?> filed =
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
                    800,
                    "occurredOn",
                    today,
                    "note",
                    "zomato again",
                    "categoryId",
                    other)),
            Map.class);
    assertNull(old.get("categoryId"));

    Map<String, Object> rule =
        new HashMap<>(
            Map.of(
                "name",
                "Food delivery",
                "text",
                "zomato,swiggy",
                "textOp",
                "CONTAINS",
                "categoryId",
                food));
    Map<?, ?> preview = post(s.token(), ws(s) + "/rules/test", rule, Map.class);
    assertEquals(1, ((Number) preview.get("matches")).intValue()); // only the uncategorised one

    Map<?, ?> made = post(s.token(), ws(s) + "/rules", rule, Map.class);
    Map<?, ?> applied =
        post(s.token(), ws(s) + "/rules/" + made.get("id") + "/apply", Map.of(), Map.class);
    assertEquals(1, ((Number) applied.get("updated")).intValue());
    assertEquals(
        food,
        get(s.token(), ws(s) + "/transactions/" + old.get("id"), Map.class).get("categoryId"));
    assertEquals(
        other,
        get(s.token(), ws(s) + "/transactions/" + filed.get("id"), Map.class)
            .get("categoryId")); // untouched

    // and from now on, new entries are filed as they arrive
    Map<?, ?> fresh =
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
                    900,
                    "occurredOn",
                    today,
                    "note",
                    "Swiggy order")),
            Map.class);
    assertEquals(food, fresh.get("categoryId"));
    Map<?, ?> unrelated =
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
                    900,
                    "occurredOn",
                    today,
                    "note",
                    "bus ticket")),
            Map.class);
    assertNull(unrelated.get("categoryId"));

    // a rule with no condition, or a category of the wrong kind, is refused
    var empty =
        HttpRequest.POST(ws(s) + "/rules", Map.of("name", "Nothing", "categoryId", food))
            .bearerAuth(s.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(empty));
    var wrongKind =
        HttpRequest.POST(
                ws(s) + "/rules",
                Map.of(
                    "name", "Income as spend", "text", "x", "type", "INCOME", "categoryId", food))
            .bearerAuth(s.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(wrongKind));
  }
}

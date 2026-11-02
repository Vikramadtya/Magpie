package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RecurringPostingTest extends ApiTestBase {

  private String account(Session s, String ws) {
    return (String)
        post(
                s.token(),
                ws + "/accounts",
                Map.of(
                    "name",
                    "Bank",
                    "type",
                    "CHECKING",
                    "currency",
                    "USD",
                    "openingBalanceMinor",
                    100_000),
                Map.class)
            .get("id");
  }

  private Map<String, Object> rule(String acc, LocalDate start, boolean autoPost) {
    return Map.of(
        "name",
        "Rent",
        "accountId",
        acc,
        "type",
        "EXPENSE",
        "amountMinor",
        30_000,
        "frequency",
        "MONTHLY",
        "intervalN",
        1,
        "startOn",
        start.toString(),
        "autoPost",
        autoPost);
  }

  @Test
  void aRuleThatIsAlreadyDuePostsAtOnce() {
    Session s = register("rec");
    String ws = "/api/v1/workspaces/" + s.workspaceId();
    String acc = account(s, ws);

    post(s.token(), ws + "/recurring", rule(acc, LocalDate.now().minusDays(3), true), Map.class);

    Map<?, ?> account = get(s.token(), ws + "/accounts/" + acc, Map.class);
    assertEquals(70_000, ((Number) account.get("balanceMinor")).intValue());
    Map<?, ?> page = get(s.token(), ws + "/transactions?accountId=" + acc, Map.class);
    assertEquals(1, ((List<?>) page.get("items")).size());
  }

  @Test
  void aFutureRuleWaitsForItsDate() {
    Session s = register("rec-future");
    String ws = "/api/v1/workspaces/" + s.workspaceId();
    String acc = account(s, ws);

    post(s.token(), ws + "/recurring", rule(acc, LocalDate.now().plusDays(5), true), Map.class);

    Map<?, ?> account = get(s.token(), ws + "/accounts/" + acc, Map.class);
    assertEquals(100_000, ((Number) account.get("balanceMinor")).intValue());
  }
}

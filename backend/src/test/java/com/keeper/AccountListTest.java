package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AccountListTest extends ApiTestBase {

  @Test
  void aTransactionShowsUnderItsOwnAccountAmongManyAccounts() {
    Session s = register("many");
    String ws = "/api/v1/workspaces/" + s.workspaceId();
    String card = null;
    for (int i = 1; i <= 8; i++) {
      String type = i == 7 ? "CREDIT_CARD" : "CHECKING";
      String id =
          (String)
              post(
                      s.token(),
                      ws + "/accounts",
                      Map.of(
                          "name",
                          "Account " + i,
                          "type",
                          type,
                          "currency",
                          "USD",
                          "openingBalanceMinor",
                          0),
                      Map.class)
                  .get("id");
      if (i == 7) card = id;
    }
    post(
        s.token(),
        ws + "/transactions",
        Map.of(
            "accountId",
            card,
            "type",
            "EXPENSE",
            "amountMinor",
            4_200,
            "occurredOn",
            LocalDate.now().toString()),
        Map.class);

    Map<?, ?> page = get(s.token(), ws + "/transactions?accountId=" + card, Map.class);
    assertEquals(1, ((List<?>) page.get("items")).size());
    assertEquals(
        -4_200,
        ((Number) get(s.token(), ws + "/accounts/" + card, Map.class).get("balanceMinor"))
            .intValue());
  }
}

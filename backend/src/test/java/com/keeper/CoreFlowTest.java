package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class CoreFlowTest extends ApiTestBase {

  private String base(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private String newAccount(Session s, String name, long opening) {
    Map<?, ?> a =
        post(
            s.token(),
            base(s) + "/accounts",
            Map.of(
                "name",
                name,
                "type",
                "CHECKING",
                "currency",
                "USD",
                "openingBalanceMinor",
                opening),
            Map.class);
    return (String) a.get("id");
  }

  private long balance(Session s, String accountId) {
    return ((Number)
            get(s.token(), base(s) + "/accounts/" + accountId, Map.class).get("balanceMinor"))
        .longValue();
  }

  private Map<?, ?> expense(Session s, String accountId, long amount, String date) {
    return post(
        s.token(),
        base(s) + "/transactions",
        Map.of(
            "accountId",
            accountId,
            "type",
            "EXPENSE",
            "amountMinor",
            amount,
            "occurredOn",
            date,
            "note",
            "coffee"),
        Map.class);
  }

  @Test
  void balancesFollowCreateUpdateDelete() {
    Session s = register("bal");
    String acc = newAccount(s, "Checking", 100_000);
    Map<?, ?> tx = expense(s, acc, 2_500, "2026-03-01");
    assertEquals(97_500, balance(s, acc));

    put(
        s.token(),
        base(s) + "/transactions/" + tx.get("id"),
        Map.of(
            "expectedVersion",
            tx.get("version"),
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            1_000,
            "occurredOn",
            "2026-03-01"),
        Map.class);
    assertEquals(99_000, balance(s, acc));

    http()
        .exchange(
            HttpRequest.DELETE(base(s) + "/transactions/" + tx.get("id")).bearerAuth(s.token()));
    assertEquals(100_000, balance(s, acc));

    // the cached balance must match a rebuild from the rows
    Map<?, ?> rebuilt =
        post(s.token(), base(s) + "/accounts/" + acc + "/recalculate", Map.of(), Map.class);
    assertEquals(100_000, ((Number) rebuilt.get("balanceMinor")).longValue());
  }

  @Test
  void transferMovesMoneyAndDeletesBothLegs() {
    Session s = register("xfer");
    String a = newAccount(s, "A", 50_000);
    String b = newAccount(s, "B", 0);
    List<?> legs =
        postList(
            s.token(),
            base(s) + "/transfers",
            Map.of(
                "fromAccountId",
                a,
                "toAccountId",
                b,
                "amountMinor",
                12_000,
                "occurredOn",
                "2026-03-02"));
    assertEquals(2, legs.size());
    assertEquals(38_000, balance(s, a));
    assertEquals(12_000, balance(s, b));

    String legId = (String) ((Map<?, ?>) legs.get(0)).get("id");
    http().exchange(HttpRequest.DELETE(base(s) + "/transactions/" + legId).bearerAuth(s.token()));
    assertEquals(50_000, balance(s, a));
    assertEquals(0, balance(s, b));
  }

  @Test
  void staleEditGets409() {
    Session s = register("lock");
    String acc = newAccount(s, "A", 0);
    Map<?, ?> tx = expense(s, acc, 100, "2026-03-03");
    Map<String, Object> edit =
        Map.of(
            "expectedVersion",
            tx.get("version"),
            "accountId",
            acc,
            "type",
            "EXPENSE",
            "amountMinor",
            200,
            "occurredOn",
            "2026-03-03");
    put(s.token(), base(s) + "/transactions/" + tx.get("id"), edit, Map.class);
    // same stale version again
    assertEquals(
        HttpStatus.CONFLICT,
        statusOf(
            HttpRequest.PUT(base(s) + "/transactions/" + tx.get("id"), edit)
                .bearerAuth(s.token())));
  }

  @Test
  void idempotencyKeyPreventsDuplicates() {
    Session s = register("idem");
    String acc = newAccount(s, "A", 0);
    Map<String, Object> body =
        Map.of("accountId", acc, "type", "EXPENSE", "amountMinor", 300, "occurredOn", "2026-03-04");
    var req =
        HttpRequest.POST(base(s) + "/transactions", body)
            .bearerAuth(s.token())
            .header("Idempotency-Key", "k-1");
    Map<?, ?> first = http().retrieve(req, Map.class);
    Map<?, ?> second = http().retrieve(req, Map.class);
    assertEquals(first.get("id"), second.get("id"));
    assertEquals(-300, balance(s, acc));
  }

  @Test
  void keysetPaginationWalksEveryRowOnce() {
    Session s = register("page");
    String acc = newAccount(s, "A", 0);
    for (int i = 1; i <= 7; i++) expense(s, acc, 100, "2026-04-0" + i);
    Map<?, ?> p1 = get(s.token(), base(s) + "/transactions?limit=3", Map.class);
    assertEquals(3, ((List<?>) p1.get("items")).size());
    Map<?, ?> p2 =
        get(s.token(), base(s) + "/transactions?limit=3&cursor=" + p1.get("nextCursor"), Map.class);
    Map<?, ?> p3 =
        get(s.token(), base(s) + "/transactions?limit=3&cursor=" + p2.get("nextCursor"), Map.class);
    assertEquals(1, ((List<?>) p3.get("items")).size());
    assertNull(p3.get("nextCursor"));
    Map<?, ?> filtered =
        get(s.token(), base(s) + "/transactions?from=2026-04-05&to=2026-04-06", Map.class);
    assertEquals(2, ((List<?>) filtered.get("items")).size());
  }

  @Test
  void categoryKindMustMatchTransactionType() {
    Session s = register("kind");
    String acc = newAccount(s, "A", 0);
    List<?> cats = getList(s.token(), base(s) + "/categories");
    String incomeCat =
        (String)
            cats.stream()
                .map(c -> (Map<?, ?>) c)
                .filter(c -> "INCOME".equals(c.get("kind")))
                .findFirst()
                .orElseThrow()
                .get("id");
    var bad =
        HttpRequest.POST(
                base(s) + "/transactions",
                Map.of(
                    "accountId",
                    acc,
                    "type",
                    "EXPENSE",
                    "amountMinor",
                    100,
                    "occurredOn",
                    "2026-03-05",
                    "categoryId",
                    incomeCat))
            .bearerAuth(s.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(bad));
  }

  @Test
  void invalidAmountIsRejected() {
    Session s = register("val");
    String acc = newAccount(s, "A", 0);
    var bad =
        HttpRequest.POST(
                base(s) + "/transactions",
                Map.of(
                    "accountId",
                    acc,
                    "type",
                    "EXPENSE",
                    "amountMinor",
                    -5,
                    "occurredOn",
                    "2026-03-05"))
            .bearerAuth(s.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(bad));
  }

  @Test
  void commentsAndPayeeDefaultCategory() {
    Session s = register("cm");
    String acc = newAccount(s, "A", 0);
    List<?> cats = getList(s.token(), base(s) + "/categories");
    String exp =
        (String)
            cats.stream()
                .map(c -> (Map<?, ?>) c)
                .filter(c -> "EXPENSE".equals(c.get("kind")))
                .findFirst()
                .orElseThrow()
                .get("id");
    Map<?, ?> payee =
        post(
            s.token(),
            base(s) + "/payees",
            Map.of("name", "Corner Shop", "defaultCategoryId", exp),
            Map.class);
    Map<?, ?> tx =
        post(
            s.token(),
            base(s) + "/transactions",
            Map.of(
                "accountId",
                acc,
                "type",
                "EXPENSE",
                "amountMinor",
                100,
                "occurredOn",
                "2026-03-06",
                "payeeId",
                payee.get("id")),
            Map.class);
    assertEquals(exp, tx.get("categoryId"));
    post(
        s.token(),
        base(s) + "/transactions/" + tx.get("id") + "/comments",
        Map.of("body", "check receipt"),
        Map.class);
    assertEquals(
        1, getList(s.token(), base(s) + "/transactions/" + tx.get("id") + "/comments").size());
    assertNotNull(getList(s.token(), base(s) + "/activity"));
    assertTrue(getList(s.token(), base(s) + "/activity").size() >= 2);
  }

  @Test
  void crossWorkspaceReferencesAreRejected() {
    Session mine = register("mine");
    Session other = register("other");
    String foreignAccount = newAccount(other, "Theirs", 0);
    var bad =
        HttpRequest.POST(
                base(mine) + "/transactions",
                Map.of(
                    "accountId",
                    foreignAccount,
                    "type",
                    "EXPENSE",
                    "amountMinor",
                    100,
                    "occurredOn",
                    "2026-03-05"))
            .bearerAuth(mine.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(bad));
    assertNotNull(UUID.fromString(foreignAccount));
  }
}

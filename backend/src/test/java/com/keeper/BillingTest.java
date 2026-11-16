package com.keeper;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.keeper.billing.Entitlements;
import com.keeper.common.db.Db;
import io.micronaut.context.annotation.Property;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpStatus;
import jakarta.inject.Inject;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@Property(name = "keeper.admin.emails", value = "owner@keeper-billing.example")
@Property(name = "keeper.rate-limit.enabled", value = "false")
class BillingTest extends ApiTestBase {
  @Inject Entitlements entitlements;
  @Inject Db db;

  @BeforeEach
  void on() {
    entitlements.setEnforced(true);
  }

  @AfterEach
  void off() {
    entitlements.setEnforced(false);
  }

  private Session admin() {
    String email = "owner@keeper-billing.example";
    try {
      http()
          .retrieve(
              HttpRequest.POST(
                  "/api/v1/auth/register",
                  Map.of("email", email, "password", "correct-horse-1", "name", "Owner")),
              Map.class);
    } catch (Exception alreadyThere) {
      // the account survives between runs of the suite
    }
    Map<?, ?> login =
        http()
            .retrieve(
                HttpRequest.POST(
                    "/api/v1/auth/login", Map.of("email", email, "password", "correct-horse-1")),
                Map.class);
    String token = (String) login.get("accessToken");
    Map<?, ?> me = get(token, "/api/v1/me", Map.class);
    UUID user = UUID.fromString((String) ((Map<?, ?>) me.get("user")).get("id"));
    UUID ws =
        UUID.fromString((String) ((Map<?, ?>) ((List<?>) me.get("workspaces")).get(0)).get("id"));
    return new Session(token, user, ws);
  }

  private String ws(Session s) {
    return "/api/v1/workspaces/" + s.workspaceId();
  }

  private Map<?, ?> code(Session admin, Map<String, Object> body) {
    return post(admin.token(), "/api/v1/admin/codes", body, Map.class);
  }

  private Map<?, ?> billing(Session s) {
    return get(s.token(), ws(s) + "/billing", Map.class);
  }

  private HttpStatus redeem(Session s, String code) {
    return statusOf(
        HttpRequest.POST(ws(s) + "/billing/redeem", Map.of("code", code)).bearerAuth(s.token()));
  }

  private HttpStatus createAccount(Session s, String name) {
    return statusOf(
        HttpRequest.POST(
                ws(s) + "/accounts",
                Map.of(
                    "name", name, "type", "CHECKING", "currency", "USD", "openingBalanceMinor", 0))
            .bearerAuth(s.token()));
  }

  @Test
  void aNewUserIsOnFreeAndHitsTheLimits() {
    Session s = register("free-user");
    assertEquals("FREE", billing(s).get("plan"));
    assertEquals(HttpStatus.OK, createAccount(s, "One"));
    assertEquals(HttpStatus.OK, createAccount(s, "Two"));
    assertEquals(HttpStatus.PAYMENT_REQUIRED, createAccount(s, "Three"));

    var goal = Map.of("name", "Trip", "targetMinor", 1000, "currency", "USD");
    assertEquals(
        HttpStatus.OK, statusOf(HttpRequest.POST(ws(s) + "/goals", goal).bearerAuth(s.token())));
    assertEquals(
        HttpStatus.PAYMENT_REQUIRED,
        statusOf(HttpRequest.POST(ws(s) + "/goals", goal).bearerAuth(s.token())));

    // Pro-only features
    assertEquals(
        HttpStatus.PAYMENT_REQUIRED,
        statusOf(
            HttpRequest.PUT(ws(s) + "/digest", Map.of("enabled", true)).bearerAuth(s.token())));
    assertEquals(
        HttpStatus.PAYMENT_REQUIRED,
        statusOf(
            HttpRequest.POST(ws(s) + "/quick-keys", Map.of("label", "phone"))
                .bearerAuth(s.token())));
    assertEquals(
        HttpStatus.PAYMENT_REQUIRED,
        statusOf(HttpRequest.GET(ws(s) + "/analytics/investments").bearerAuth(s.token())));
  }

  @Test
  void nothingIsLimitedWhileEnforcementIsOff() {
    entitlements.setEnforced(false);
    Session s = register("open");
    for (int i = 0; i < 4; i++) assertEquals(HttpStatus.OK, createAccount(s, "A" + i));
    assertEquals("OPEN", billing(s).get("source"));
  }

  @Test
  void anAccessCodeGivesProForItsDaysAndEndsOnItsOwnRules() {
    Session boss = admin();
    Session a = register("code-a");
    Session b = register("code-b");
    Session c = register("code-c");
    String text = "TEST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    Map<?, ?> made =
        code(
            boss,
            new HashMap<>(
                Map.of(
                    "code",
                    text,
                    "kind",
                    "ACCESS",
                    "accessDays",
                    30,
                    "maxRedemptions",
                    2,
                    "perUserLimit",
                    1)));
    assertEquals("ACTIVE", made.get("status"));

    assertEquals(HttpStatus.OK, redeem(a, text.toLowerCase())); // case does not matter
    Map<?, ?> after = billing(a);
    assertEquals("PRO", after.get("plan"));
    assertEquals("CODE", after.get("source"));
    Instant until = Instant.parse((String) after.get("proUntil"));
    assertTrue(
        until.isAfter(Instant.now().plusSeconds(29L * 86_400))
            && until.isBefore(Instant.now().plusSeconds(31L * 86_400)));
    assertEquals(HttpStatus.OK, createAccount(a, "No limit now"));
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, redeem(a, text)); // once per person

    assertEquals(HttpStatus.OK, redeem(b, text));
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, redeem(c, text)); // the 2 uses are gone
    assertEquals("FREE", billing(c).get("plan"));
  }

  @Test
  void codesRespectTheirWindowAndCanBeSwitchedOff() {
    Session boss = admin();
    Session s = register("window");
    String past = "OLD-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    String future = "NEW-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    String off = "OFF-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    code(
        boss,
        new HashMap<>(
            Map.of(
                "code",
                past,
                "kind",
                "ACCESS",
                "accessDays",
                7,
                "startsAt",
                Instant.now().minusSeconds(7200).toString(),
                "expiresAt",
                Instant.now().minusSeconds(3600).toString())));
    code(
        boss,
        new HashMap<>(
            Map.of(
                "code",
                future,
                "kind",
                "ACCESS",
                "accessDays",
                7,
                "startsAt",
                Instant.now().plusSeconds(86_400).toString())));
    Map<?, ?> live =
        code(boss, new HashMap<>(Map.of("code", off, "kind", "ACCESS", "accessDays", 7)));
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, redeem(s, past));
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, redeem(s, future));
    patch(
        boss.token(), "/api/v1/admin/codes/" + live.get("id"), Map.of("active", false), Map.class);
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, redeem(s, off));
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, redeem(s, "NO-SUCH-CODE"));
    assertEquals("FREE", billing(s).get("plan"));
  }

  @Test
  void accessStacksAndLapsesBackToFree() {
    Session boss = admin();
    Session s = register("stack");
    String one = "S1-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    String two = "S2-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    code(boss, new HashMap<>(Map.of("code", one, "kind", "ACCESS", "accessDays", 10)));
    code(boss, new HashMap<>(Map.of("code", two, "kind", "ACCESS", "accessDays", 10)));
    redeem(s, one);
    Instant first = Instant.parse((String) billing(s).get("proUntil"));
    redeem(s, two);
    Instant second = Instant.parse((String) billing(s).get("proUntil"));
    assertTrue(second.isAfter(first.plusSeconds(9L * 86_400))); // added on top, not replaced

    db.update(
        "UPDATE access_grants SET granted_until = NOW() - INTERVAL '1 day' WHERE user_id = ?",
        s.userId());
    entitlements.changed(s.userId());
    assertEquals("FREE", billing(s).get("plan"));
  }

  @Test
  void discountCodesPriceThePlanAndCannotBeRedeemedAsAccess() {
    Session boss = admin();
    Session s = register("discount");
    String pct = "PCT-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    String flat = "FLAT-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    code(
        boss,
        new HashMap<>(
            Map.of("code", pct, "kind", "DISCOUNT", "discountPercent", 20, "discountCycles", 1)));
    code(boss, new HashMap<>(Map.of("code", flat, "kind", "DISCOUNT", "discountMinor", 5_000)));

    Map<?, ?> quote =
        post(
            s.token(),
            ws(s) + "/billing/quote",
            Map.of("interval", "MONTHLY", "code", pct),
            Map.class);
    assertEquals(14_900, ((Number) quote.get("baseMinor")).intValue());
    assertEquals(2_980, ((Number) quote.get("discountMinor")).intValue());
    assertEquals(11_920, ((Number) quote.get("firstPaymentMinor")).intValue());
    assertTrue(((String) quote.get("note")).contains("first payment"));

    Map<?, ?> yearly =
        post(
            s.token(),
            ws(s) + "/billing/quote",
            Map.of("interval", "YEARLY", "code", flat),
            Map.class);
    assertEquals(149_900 - 5_000, ((Number) yearly.get("firstPaymentMinor")).intValue());
    assertTrue(((String) yearly.get("note")).contains("every payment"));

    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, redeem(s, pct)); // a discount is not access
    Map<?, ?> plain =
        post(s.token(), ws(s) + "/billing/quote", Map.of("interval", "MONTHLY"), Map.class);
    assertEquals(14_900, ((Number) plain.get("firstPaymentMinor")).intValue());

    // paying is not open until a provider is connected
    assertEquals(
        HttpStatus.UNPROCESSABLE_ENTITY,
        statusOf(
            HttpRequest.POST(ws(s) + "/billing/checkout", Map.of("interval", "MONTHLY"))
                .bearerAuth(s.token())));
  }

  @Test
  void onlyAdministratorsManageCodesAndGrantAccess() {
    Session boss = admin();
    Session user = register("not-admin");
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(HttpRequest.GET("/api/v1/admin/codes").bearerAuth(user.token())));
    assertEquals(
        HttpStatus.FORBIDDEN,
        statusOf(
            HttpRequest.POST("/api/v1/admin/codes", Map.of("kind", "ACCESS", "accessDays", 5))
                .bearerAuth(user.token())));
    assertTrue(Boolean.TRUE.equals(get(boss.token(), "/api/v1/me", Map.class).get("admin")));
    assertFalse(Boolean.TRUE.equals(get(user.token(), "/api/v1/me", Map.class).get("admin")));

    // an administrator can give a person Pro directly, e.g. after a payment received elsewhere
    String email =
        db.one("SELECT email FROM users WHERE id = ?", rs -> rs.getString(1), user.userId())
            .orElseThrow();
    put(
        boss.token(),
        "/api/v1/admin/grants",
        Map.of("email", email, "days", 31, "note", "Paid by UPI"),
        Map.class);
    assertEquals("ADMIN", billing(user).get("source"));
    assertEquals(HttpStatus.OK, createAccount(user, "X1"));
  }

  @Test
  void aGeneratedCodeIsReadableAndUnique() {
    Session boss = admin();
    Map<?, ?> a = code(boss, new HashMap<>(Map.of("kind", "ACCESS", "accessDays", 3)));
    Map<?, ?> b = code(boss, new HashMap<>(Map.of("kind", "ACCESS", "accessDays", 3)));
    assertTrue(((String) a.get("code")).matches("[A-Z2-9]{4}-[A-Z2-9]{4}"));
    assertFalse(a.get("code").equals(b.get("code")));
    var bad =
        HttpRequest.POST(
                "/api/v1/admin/codes",
                Map.of("kind", "DISCOUNT", "discountPercent", 10, "discountMinor", 100))
            .bearerAuth(boss.token());
    assertEquals(HttpStatus.BAD_REQUEST, statusOf(bad)); // a percentage or an amount, not both
  }
}

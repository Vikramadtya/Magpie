package com.keeper.billing;

import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.BusinessRuleException;
import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.context.annotation.Value;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Access codes (free Pro time) and discount codes (money off a paid plan), with when each is valid,
 * how many times it can be used, and how long the access or discount lasts.
 */
@Singleton
public class CodeService {
  private static final Pattern FORMAT = Pattern.compile("^[A-Z0-9][A-Z0-9-]{2,38}[A-Z0-9]$");
  private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  private static final SecureRandom RANDOM = new SecureRandom();

  /** A code as the administrator sees it. */
  @Serdeable
  public record Code(
      UUID id,
      String code,
      String kind,
      String description,
      boolean active,
      Instant startsAt,
      Instant expiresAt,
      Integer maxRedemptions,
      int perUserLimit,
      int redeemedCount,
      Integer accessDays,
      Integer discountPercent,
      Long discountMinor,
      Integer discountCycles,
      Instant createdAt,
      String status) {}

  @Serdeable
  public record Redemption(String email, String name, Instant redeemedAt, Instant grantsUntil) {}

  @Serdeable
  public record Redeemed(String code, int days, Instant accessUntil) {}

  /** The price of a plan with a discount code applied, for display before paying. */
  @Serdeable
  public record Quote(
      String interval,
      String currency,
      long baseMinor,
      long discountMinor,
      long firstPaymentMinor,
      String code,
      String note) {}

  private final Db db;
  private final Entitlements entitlements;
  private final long monthlyMinor;
  private final long yearlyMinor;
  private final String currency;

  public CodeService(
      Db db,
      Entitlements entitlements,
      @Value("${keeper.billing.price-monthly-minor:14900}") long monthlyMinor,
      @Value("${keeper.billing.price-yearly-minor:149900}") long yearlyMinor,
      @Value("${keeper.billing.currency:INR}") String currency) {
    this.db = db;
    this.entitlements = entitlements;
    this.monthlyMinor = monthlyMinor;
    this.yearlyMinor = yearlyMinor;
    this.currency = currency;
  }

  public long priceMinor(String interval) {
    return "YEARLY".equals(interval) ? yearlyMinor : monthlyMinor;
  }

  public String currency() {
    return currency;
  }

  // ---------- administration ----------

  private static final String SELECT =
      "SELECT id, code, kind, description, active, starts_at, expires_at, max_redemptions, per_user_limit, "
          + "redeemed_count, access_days, discount_percent, discount_minor, discount_cycles, created_at FROM codes";

  private Code map(java.sql.ResultSet rs) throws java.sql.SQLException {
    Integer max = (Integer) rs.getObject("max_redemptions");
    int used = rs.getInt("redeemed_count");
    boolean active = rs.getBoolean("active");
    Instant starts = instant(rs.getTimestamp("starts_at"));
    Instant expires = instant(rs.getTimestamp("expires_at"));
    Instant now = Instant.now();
    String status =
        !active
            ? "OFF"
            : expires != null && !expires.isAfter(now)
                ? "EXPIRED"
                : max != null && used >= max
                    ? "USED_UP"
                    : starts != null && starts.isAfter(now) ? "SCHEDULED" : "ACTIVE";
    return new Code(
        rs.getObject("id", UUID.class),
        rs.getString("code"),
        rs.getString("kind"),
        rs.getString("description"),
        active,
        starts,
        expires,
        max,
        rs.getInt("per_user_limit"),
        used,
        (Integer) rs.getObject("access_days"),
        (Integer) rs.getObject("discount_percent"),
        (Long) rs.getObject("discount_minor"),
        (Integer) rs.getObject("discount_cycles"),
        instant(rs.getTimestamp("created_at")),
        status);
  }

  private static Instant instant(Timestamp t) {
    return t == null ? null : t.toInstant();
  }

  private static Timestamp stamp(Instant i) {
    return i == null ? null : Timestamp.from(i);
  }

  public List<Code> list() {
    return db.list(SELECT + " ORDER BY created_at DESC", this::map);
  }

  private Code get(UUID id) {
    return db.one(SELECT + " WHERE id = ?", this::map, id)
        .orElseThrow(() -> new ResourceNotFoundException("Code", id.toString()));
  }

  /** A readable random code such as K7QD-M2XP, avoiding look-alike characters. */
  static String generate() {
    StringBuilder sb = new StringBuilder();
    for (int i = 0; i < 8; i++) {
      if (i == 4) sb.append('-');
      sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
    }
    return sb.toString();
  }

  static String normalise(String raw) {
    return raw == null ? "" : raw.trim().toUpperCase().replaceAll("\\s+", "");
  }

  public Code create(UUID actor, AdminController.CodeRequest r) {
    boolean access = "ACCESS".equals(r.kind());
    if (!access && !"DISCOUNT".equals(r.kind()))
      throw new BadRequestException("Kind must be ACCESS or DISCOUNT");
    if (access && (r.accessDays() == null || r.accessDays() < 1))
      throw new BadRequestException("An access code needs the number of days of access it gives");
    if (!access && (r.discountPercent() == null) == (r.discountMinor() == null))
      throw new BadRequestException(
          "A discount code needs either a percentage or an amount, not both");
    if (r.startsAt() != null && r.expiresAt() != null && !r.expiresAt().isAfter(r.startsAt()))
      throw new BadRequestException("The end must be after the start");
    String code = r.code() == null || r.code().isBlank() ? generate() : normalise(r.code());
    if (!FORMAT.matcher(code).matches())
      throw new BadRequestException("A code is 4 to 40 letters, digits or dashes");
    if (db.count("SELECT count(*) FROM codes WHERE upper(code) = ?", code) > 0)
      throw new BusinessRuleException("That code already exists");
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO codes(id, code, kind, description, starts_at, expires_at, max_redemptions, per_user_limit, "
            + "access_days, discount_percent, discount_minor, discount_cycles, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
        id,
        code,
        r.kind(),
        r.description() == null || r.description().isBlank() ? null : r.description().trim(),
        stamp(r.startsAt()),
        stamp(r.expiresAt()),
        r.maxRedemptions(),
        r.perUserLimit() == null ? 1 : r.perUserLimit(),
        access ? r.accessDays() : null,
        access ? null : r.discountPercent(),
        access ? null : r.discountMinor(),
        access ? null : r.discountCycles(),
        actor);
    return get(id);
  }

  public Code update(UUID id, AdminController.CodeUpdate u) {
    get(id);
    db.update(
        "UPDATE codes SET active = COALESCE(?, active), description = COALESCE(?, description), "
            + "expires_at = CASE WHEN ? THEN ? ELSE expires_at END, "
            + "max_redemptions = CASE WHEN ? THEN ? ELSE max_redemptions END WHERE id = ?",
        u.active(),
        u.description(),
        u.setExpiry(),
        stamp(u.expiresAt()),
        u.setMax(),
        u.maxRedemptions(),
        id);
    return get(id);
  }

  public List<Redemption> redemptions(UUID id) {
    get(id);
    return db.list(
        "SELECT u.email, u.name, r.redeemed_at, r.grants_until FROM code_redemptions r JOIN users u ON u.id = r.user_id "
            + "WHERE r.code_id = ? ORDER BY r.redeemed_at DESC",
        rs ->
            new Redemption(
                rs.getString(1),
                rs.getString(2),
                instant(rs.getTimestamp(3)),
                instant(rs.getTimestamp(4))),
        id);
  }

  // ---------- access ----------

  /** Adds days of Pro to a user, after any access they already have, so redeeming twice stacks. */
  public Instant grant(
      UUID userId, int days, String source, UUID codeId, String note, UUID grantedBy) {
    Instant current =
        db.one(
                "SELECT max(granted_until) FROM access_grants WHERE user_id = ? AND granted_until > NOW()",
                rs -> rs.getTimestamp(1) == null ? null : rs.getTimestamp(1).toInstant(),
                userId)
            .orElse(null);
    Instant from = current == null ? Instant.now() : current;
    Instant until = from.plus(days, ChronoUnit.DAYS);
    db.update(
        "INSERT INTO access_grants(user_id, granted_until, source, code_id, note, granted_by) VALUES (?,?,?,?,?,?)",
        userId,
        Timestamp.from(until),
        source,
        codeId,
        note,
        grantedBy);
    entitlements.changed(userId);
    return until;
  }

  /** Why a code cannot be used right now, or empty when it can. */
  private Optional<String> problem(Code c, UUID userId) {
    Instant now = Instant.now();
    if (!c.active()) return Optional.of("That code is no longer active.");
    if (c.startsAt() != null && c.startsAt().isAfter(now))
      return Optional.of("That code is not valid yet.");
    if (c.expiresAt() != null && !c.expiresAt().isAfter(now))
      return Optional.of("That code has expired.");
    if (c.maxRedemptions() != null && c.redeemedCount() >= c.maxRedemptions())
      return Optional.of("That code has been used the most times it allows.");
    if (userId != null
        && db.count(
                "SELECT count(*) FROM code_redemptions WHERE code_id = ? AND user_id = ?",
                c.id(),
                userId)
            >= c.perUserLimit()) return Optional.of("You have already used that code.");
    return Optional.empty();
  }

  /**
   * Uses an access code for this user: gives Pro for the code's number of days, counting one use.
   */
  public Redeemed redeemAccess(UUID userId, String raw) {
    String code = normalise(raw);
    return db.tx(
        () -> {
          // the row is locked, so two people using the last use of a code cannot both succeed
          Code c =
              db.one(SELECT + " WHERE upper(code) = ? FOR UPDATE", this::map, code)
                  .orElseThrow(() -> new BusinessRuleException("That code is not valid."));
          if ("DISCOUNT".equals(c.kind()))
            throw new BusinessRuleException(
                "That is a discount code. Enter it when you choose a plan to pay for.");
          Optional<String> problem = problem(c, userId);
          if (problem.isPresent()) throw new BusinessRuleException(problem.get());
          db.update("UPDATE codes SET redeemed_count = redeemed_count + 1 WHERE id = ?", c.id());
          Instant until = grant(userId, c.accessDays(), "CODE", c.id(), "Code " + c.code(), null);
          db.update(
              "INSERT INTO code_redemptions(code_id, user_id, grants_until) VALUES (?,?,?)",
              c.id(),
              userId,
              Timestamp.from(until));
          return new Redeemed(c.code(), c.accessDays(), until);
        });
  }

  // ---------- discounts ----------

  /** The price of a plan after an optional discount code; nothing is used up by asking. */
  public Quote quote(UUID userId, String interval, String raw) {
    String per = "YEARLY".equals(interval) ? "YEARLY" : "MONTHLY";
    long base = priceMinor(per);
    if (raw == null || raw.isBlank()) return new Quote(per, currency, base, 0, base, null, null);
    Code c =
        db.one(SELECT + " WHERE upper(code) = ?", this::map, normalise(raw))
            .orElseThrow(() -> new BusinessRuleException("That code is not valid."));
    if (!"DISCOUNT".equals(c.kind()))
      throw new BusinessRuleException(
          "That is an access code. Use \"Redeem a code\" to add Pro time.");
    Optional<String> problem = problem(c, userId);
    if (problem.isPresent()) throw new BusinessRuleException(problem.get());
    long off = discountOn(c, base);
    String when =
        c.discountCycles() == null
            ? "on every payment"
            : c.discountCycles() == 1
                ? "on the first payment"
                : "on the first " + c.discountCycles() + " payments";
    return new Quote(
        per, currency, base, off, base - off, c.code(), "Discount applies " + when + ".");
  }

  static long discountOn(Code c, long base) {
    long off =
        c.discountPercent() != null
            ? base * c.discountPercent() / 100
            : Math.min(c.discountMinor(), base);
    return Math.max(0, Math.min(off, base));
  }
}

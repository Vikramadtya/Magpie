package com.keeper.billing;

import com.keeper.common.db.Db;
import io.micronaut.context.annotation.Value;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * The one place that decides what a workspace may do. The plan belongs to the workspace's owner and
 * is Pro when they pay, or hold an unexpired access grant; otherwise Free. While {@code
 * keeper.billing.enforce} is off every workspace behaves as Pro, so nothing changes until it is
 * switched on.
 */
@Singleton
public class Entitlements {

  /** What the Free plan allows. A null limit means unlimited. */
  @Serdeable
  public record Limits(
      Integer accounts,
      Integer budgets,
      Integer goals,
      Integer holdings,
      Integer transactionsPerMonth,
      Integer historyMonths,
      boolean importFiles,
      boolean digest,
      boolean household,
      boolean quickAdd,
      boolean liveInvestments) {}

  public static final Limits FREE =
      new Limits(2, 3, 1, 5, 300, 6, false, false, false, false, false);
  public static final Limits PRO =
      new Limits(null, null, null, null, null, null, true, true, true, true, true);

  /**
   * Where Pro comes from: OPEN (limits are not enforced yet), SUBSCRIPTION, CODE, ADMIN,
   * GRANDFATHER.
   */
  @Serdeable
  public record Plan(String plan, String source, Instant proUntil) {
    public boolean pro() {
      return "PRO".equals(plan);
    }
  }

  @Serdeable
  public record Usage(
      int accounts, int budgets, int goals, int holdings, int transactionsThisMonth) {}

  private record Cached(Plan plan, long at) {}

  private final Db db;
  private volatile boolean enforce;
  private final ConcurrentHashMap<UUID, Cached> cache = new ConcurrentHashMap<>();

  public Entitlements(Db db, @Value("${keeper.billing.enforce:false}") boolean enforce) {
    this.db = db;
    this.enforce = enforce;
  }

  public boolean enforced() {
    return enforce;
  }

  /** For tests and operators: turns limits on or off without a restart. */
  public void setEnforced(boolean on) {
    this.enforce = on;
    cache.clear();
  }

  /** Forgets what was remembered about a user; call after a plan change. */
  public void changed(UUID userId) {
    cache.remove(userId);
  }

  private UUID owner(UUID ws) {
    return db.one(
            "SELECT created_by FROM workspaces WHERE id = ?", rs -> rs.getObject(1, UUID.class), ws)
        .orElse(null);
  }

  public Plan planOfWorkspace(UUID ws) {
    UUID owner = owner(ws);
    return owner == null ? new Plan("FREE", "NONE", null) : planOfUser(owner);
  }

  public Plan planOfUser(UUID userId) {
    if (!enforce) return new Plan("PRO", "OPEN", null);
    Cached hit = cache.get(userId);
    if (hit != null && System.currentTimeMillis() - hit.at() < 20_000) return hit.plan();
    Plan plan = compute(userId);
    cache.put(userId, new Cached(plan, System.currentTimeMillis()));
    return plan;
  }

  private Plan compute(UUID userId) {
    Instant now = Instant.now();
    Instant paidUntil =
        db.one(
                "SELECT current_period_end FROM subscriptions WHERE user_id = ? "
                    + "AND status IN ('active', 'trialing', 'past_due') "
                    + "AND (current_period_end IS NULL OR current_period_end > NOW())",
                rs -> rs.getTimestamp(1) == null ? Instant.MAX : rs.getTimestamp(1).toInstant(),
                userId)
            .orElse(null);
    if (paidUntil != null)
      return new Plan("PRO", "SUBSCRIPTION", paidUntil == Instant.MAX ? null : paidUntil);
    record Grant(Instant until, String source) {}
    Grant grant =
        db.one(
                "SELECT granted_until, source FROM access_grants WHERE user_id = ? AND granted_until > NOW() "
                    + "ORDER BY granted_until DESC LIMIT 1",
                rs -> new Grant(rs.getTimestamp(1).toInstant(), rs.getString(2)),
                userId)
            .orElse(null);
    if (grant != null) return new Plan("PRO", grant.source(), grant.until());
    return new Plan("FREE", "NONE", null);
  }

  public Limits limitsOf(UUID ws) {
    return planOfWorkspace(ws).pro() ? PRO : FREE;
  }

  /** Throws when the Free plan does not include this feature. */
  public void require(UUID ws, Feature feature) {
    if (planOfWorkspace(ws).pro()) return;
    throw new PlanLimitException(feature.label() + " is part of the Pro plan.");
  }

  /** The same check for things that belong to a person rather than a ledger (households). */
  public void requireUser(UUID userId, Feature feature) {
    if (planOfUser(userId).pro()) return;
    throw new PlanLimitException(feature.label() + " is part of the Pro plan.");
  }

  /** Throws when adding one more would pass the Free plan's limit for it. */
  public void checkRoom(UUID ws, Limit limit) {
    if (planOfWorkspace(ws).pro()) return;
    int allowed = allowed(limit);
    int used = usedFor(ws, limit);
    if (used >= allowed) {
      throw new PlanLimitException(
          "The Free plan allows "
              + allowed
              + " "
              + limit.label()
              + ". Upgrade to Pro for no limit. What you already have stays as it is.");
    }
  }

  private static int allowed(Limit limit) {
    return switch (limit) {
      case ACCOUNTS -> FREE.accounts();
      case BUDGETS -> FREE.budgets();
      case GOALS -> FREE.goals();
      case HOLDINGS -> FREE.holdings();
      case TRANSACTIONS_PER_MONTH -> FREE.transactionsPerMonth();
    };
  }

  private int usedFor(UUID ws, Limit limit) {
    return switch (limit) {
      case ACCOUNTS -> (int)
          db.count(
              "SELECT count(*) FROM accounts WHERE workspace_id = ? AND NOT memo AND NOT is_archived",
              ws);
      case BUDGETS -> (int)
          db.count(
              "SELECT count(*) FROM budgets WHERE workspace_id = ? AND month = ?",
              ws,
              YearMonth.now().atDay(1));
      case GOALS -> (int)
          db.count("SELECT count(*) FROM goals WHERE workspace_id = ? AND archived_at IS NULL", ws);
      case HOLDINGS -> (int) db.count("SELECT count(*) FROM holdings WHERE workspace_id = ?", ws);
      case TRANSACTIONS_PER_MONTH -> (int)
          db.count(
              "SELECT count(*) FROM transactions WHERE workspace_id = ? AND deleted_at IS NULL "
                  + "AND created_at >= date_trunc('month', NOW())",
              ws);
    };
  }

  /** A new budget line needs room; changing an existing one does not. */
  public void checkBudgetRoom(UUID ws, UUID categoryId, YearMonth month) {
    if (planOfWorkspace(ws).pro()) return;
    long existing =
        db.count(
            "SELECT count(*) FROM budgets WHERE workspace_id = ? AND category_id = ? AND month = ?",
            ws,
            categoryId,
            month.atDay(1));
    if (existing == 0) checkRoom(ws, Limit.BUDGETS);
  }

  public Usage usage(UUID ws) {
    return new Usage(
        usedFor(ws, Limit.ACCOUNTS),
        usedFor(ws, Limit.BUDGETS),
        usedFor(ws, Limit.GOALS),
        usedFor(ws, Limit.HOLDINGS),
        usedFor(ws, Limit.TRANSACTIONS_PER_MONTH));
  }

  /** The earliest date charts may reach back to, or null for no limit. */
  public LocalDate earliest(UUID ws) {
    return planOfWorkspace(ws).pro()
        ? null
        : LocalDate.now().minusMonths(FREE.historyMonths()).withDayOfMonth(1);
  }

  public LocalDate[] clamp(UUID ws, LocalDate[] range) {
    LocalDate floor = earliest(ws);
    if (floor == null || !range[0].isBefore(floor)) return range;
    LocalDate start = floor.isAfter(range[1]) ? range[1] : floor;
    return new LocalDate[] {start, range[1]};
  }

  public int clampMonths(UUID ws, int months) {
    return planOfWorkspace(ws).pro() ? months : Math.min(months, FREE.historyMonths());
  }
}

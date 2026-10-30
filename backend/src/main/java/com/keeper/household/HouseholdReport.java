package com.keeper.household;

import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import com.keeper.household.HouseholdRepository.HouseholdRow;
import com.keeper.household.HouseholdRepository.MemberRow;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * The household's read-only picture, computed live from its members' own ledgers: only what each
 * member agreed to share, all expressed in the household's currency. A guest's spending on a lent
 * account is counted once, in the guest's ledger, when both of them share spending.
 */
@Singleton
public class HouseholdReport {

  @Serdeable
  public record MemberAmount(UUID memberId, String name, long amountMinor) {}

  @Serdeable
  public record CategoryLine(String name, long totalMinor, List<MemberAmount> byMember) {}

  @Serdeable
  public record BudgetLine(
      String categoryName, long amountMinor, long spentMinor, long remainingMinor) {}

  @Serdeable
  public record Summary(
      String month,
      String currency,
      long spentMinor,
      List<MemberAmount> byMember,
      List<CategoryLine> categories,
      List<BudgetLine> budgets,
      List<String> notSharing,
      List<String> missingCurrencies) {}

  @Serdeable
  public record TripLine(
      String name,
      LocalDate startDate,
      LocalDate endDate,
      long totalMinor,
      List<MemberAmount> byMember) {}

  @Serdeable
  public record HoldingLine(
      String owner, String symbol, String name, long valueMinor, long costMinor) {}

  @Serdeable
  public record Wealth(
      String currency,
      long netWorthMinor,
      List<MemberAmount> netWorthByMember,
      long investmentValueMinor,
      long investmentCostMinor,
      List<HoldingLine> holdings,
      List<String> notSharingNetWorth,
      List<String> notSharingInvestments,
      List<String> missingCurrencies) {}

  /** Members that share something, with the ledgers that belong to them. */
  private record Scope(
      HouseholdRow household, List<MemberRow> members, Map<UUID, MemberRow> byWorkspace) {
    List<UUID> workspaceIds() {
      return List.copyOf(byWorkspace.keySet());
    }
  }

  private final Db db;
  private final FxConverter fx;
  private final HouseholdRepository households;

  public HouseholdReport(Db db, FxConverter fx, HouseholdRepository households) {
    this.db = db;
    this.fx = fx;
    this.households = households;
  }

  public Summary summary(HouseholdRow h, YearMonth month) {
    Scope scope = scope(h, MemberRow::shareSpending);
    Set<String> missing = new LinkedHashSet<>();
    Map<UUID, Long> perMember = new LinkedHashMap<>();
    Map<String, long[]> bucketTotals = new LinkedHashMap<>();
    Map<String, String> bucketNames = new LinkedHashMap<>();
    Map<String, Map<UUID, Long>> bucketMembers = new LinkedHashMap<>();

    if (!scope.members().isEmpty()) {
      db.list(
          "SELECT t.workspace_id, w.base_currency, COALESCE(g.name, 'Uncategorized'), SUM(t.base_amount_minor) "
              + "FROM transactions t JOIN workspaces w ON w.id = t.workspace_id "
              + "LEFT JOIN categories c ON c.id = t.category_id "
              + "LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) "
              + "WHERE t.workspace_id = ANY(?) AND t.type = 'EXPENSE' AND t.deleted_at IS NULL AND t.loan_id IS NULL "
              + "AND t.base_amount_minor IS NOT NULL AND t.occurred_on BETWEEN ? AND ? "
              + "AND "
              + NOT_MIRRORED
              + " GROUP BY 1, 2, 3",
          rs -> {
            UUID ws = rs.getObject(1, UUID.class);
            String name = rs.getString(3);
            long amount = convert(rs.getLong(4), rs.getString(2), h.currency(), missing);
            MemberRow owner = scope.byWorkspace().get(ws);
            perMember.merge(owner.id(), amount, Long::sum);
            String key = name.toLowerCase();
            bucketNames.putIfAbsent(key, name);
            bucketTotals.computeIfAbsent(key, k -> new long[1])[0] += amount;
            bucketMembers
                .computeIfAbsent(key, k -> new LinkedHashMap<>())
                .merge(owner.id(), amount, Long::sum);
            return null;
          },
          scope.workspaceIds(),
          month.atDay(1),
          month.atEndOfMonth(),
          scope.workspaceIds());
    }

    List<CategoryLine> categories = new ArrayList<>();
    bucketTotals.forEach(
        (key, total) ->
            categories.add(
                new CategoryLine(
                    bucketNames.get(key), total[0], amounts(scope, bucketMembers.get(key)))));
    categories.sort(Comparator.comparingLong(CategoryLine::totalMinor).reversed());

    List<BudgetLine> budgets =
        households.budgets(h.id()).stream()
            .map(
                b -> {
                  long spent =
                      bucketTotals.getOrDefault(b.categoryName().toLowerCase(), new long[1])[0];
                  return new BudgetLine(
                      b.categoryName(), b.amountMinor(), spent, b.amountMinor() - spent);
                })
            .toList();

    long total = perMember.values().stream().mapToLong(Long::longValue).sum();
    return new Summary(
        month.toString(),
        h.currency(),
        total,
        amounts(scope, perMember),
        categories,
        budgets,
        notSharing(h, MemberRow::shareSpending),
        List.copyOf(missing));
  }

  /** Trips that share a name across members are combined into one. */
  public List<TripLine> trips(HouseholdRow h) {
    Scope scope = scope(h, MemberRow::shareSpending);
    if (scope.members().isEmpty()) return List.of();
    Set<String> missing = new LinkedHashSet<>();
    Map<String, TripLine> merged = new LinkedHashMap<>();
    Map<String, Map<UUID, Long>> members = new LinkedHashMap<>();
    db.list(
        "SELECT tr.workspace_id, w.base_currency, tr.name, tr.start_date, tr.end_date, "
            + "COALESCE(SUM(x.base_amount_minor), 0) FROM trips tr JOIN workspaces w ON w.id = tr.workspace_id "
            + "LEFT JOIN transactions x ON x.trip_id = tr.id AND x.deleted_at IS NULL AND x.type = 'EXPENSE' "
            + "AND x.loan_id IS NULL AND x.base_amount_minor IS NOT NULL AND "
            + NOT_MIRRORED.replace("t.", "x.")
            + " WHERE tr.workspace_id = ANY(?) "
            + "GROUP BY tr.id, tr.workspace_id, w.base_currency, tr.name, tr.start_date, tr.end_date",
        rs -> {
          UUID ws = rs.getObject(1, UUID.class);
          String name = rs.getString(3);
          LocalDate start = rs.getObject(4, LocalDate.class);
          LocalDate end = rs.getObject(5, LocalDate.class);
          long amount = convert(rs.getLong(6), rs.getString(2), h.currency(), missing);
          String key = name.toLowerCase();
          members
              .computeIfAbsent(key, k -> new LinkedHashMap<>())
              .merge(scope.byWorkspace().get(ws).id(), amount, Long::sum);
          merged.merge(
              key,
              new TripLine(name, start, end, amount, List.of()),
              (a, b) ->
                  new TripLine(
                      a.name(),
                      a.startDate().isBefore(b.startDate()) ? a.startDate() : b.startDate(),
                      a.endDate().isAfter(b.endDate()) ? a.endDate() : b.endDate(),
                      a.totalMinor() + b.totalMinor(),
                      List.of()));
          return null;
        },
        scope.workspaceIds(),
        scope.workspaceIds());
    List<TripLine> out = new ArrayList<>();
    merged.forEach(
        (key, t) ->
            out.add(
                new TripLine(
                    t.name(),
                    t.startDate(),
                    t.endDate(),
                    t.totalMinor(),
                    amounts(scope, members.get(key)))));
    out.sort(Comparator.comparing(TripLine::startDate).reversed());
    return out;
  }

  public Wealth wealth(HouseholdRow h) {
    Set<String> missing = new LinkedHashSet<>();

    Scope worth = scope(h, MemberRow::shareNetWorth);
    Map<UUID, Long> byMember = new LinkedHashMap<>();
    if (!worth.members().isEmpty()) {
      db.list(
          "SELECT workspace_id, currency, SUM(balance_minor) FROM accounts "
              + "WHERE workspace_id = ANY(?) AND NOT memo AND NOT is_archived GROUP BY 1, 2",
          rs -> {
            long v = convert(rs.getLong(3), rs.getString(2), h.currency(), missing);
            byMember.merge(worth.byWorkspace().get(rs.getObject(1, UUID.class)).id(), v, Long::sum);
            return null;
          },
          worth.workspaceIds());
    }

    Scope invest = scope(h, MemberRow::shareInvestments);
    List<HoldingLine> holdings = new ArrayList<>();
    if (!invest.members().isEmpty()) {
      db.list(
          "SELECT workspace_id, currency, symbol, name, ROUND(quantity * price_minor)::bigint, cost_basis_minor "
              + "FROM holdings WHERE workspace_id = ANY(?) ORDER BY 5 DESC",
          rs -> {
            String cur = rs.getString(2);
            holdings.add(
                new HoldingLine(
                    invest.byWorkspace().get(rs.getObject(1, UUID.class)).name(),
                    rs.getString(3),
                    rs.getString(4),
                    convert(rs.getLong(5), cur, h.currency(), missing),
                    convert(rs.getLong(6), cur, h.currency(), missing)));
            return null;
          },
          invest.workspaceIds());
    }

    return new Wealth(
        h.currency(),
        byMember.values().stream().mapToLong(Long::longValue).sum(),
        amounts(worth, byMember),
        holdings.stream().mapToLong(HoldingLine::valueMinor).sum(),
        holdings.stream().mapToLong(HoldingLine::costMinor).sum(),
        holdings,
        notSharing(h, MemberRow::shareNetWorth),
        notSharing(h, MemberRow::shareInvestments),
        List.copyOf(missing));
  }

  // ---------- helpers ----------

  /**
   * A mirrored copy in the owner's ledger is skipped when its original sits in a ledger this query
   * already covers; otherwise the spending would be counted twice.
   */
  private static final String NOT_MIRRORED =
      "(t.mirror_of IS NULL OR t.mirror_of NOT IN (SELECT id FROM transactions WHERE workspace_id = ANY(?)))";

  private Scope scope(HouseholdRow h, java.util.function.Predicate<MemberRow> shares) {
    List<MemberRow> members =
        households.members(h.id()).stream()
            .filter(m -> "ACTIVE".equals(m.status()) && m.userId() != null && shares.test(m))
            .toList();
    Map<UUID, MemberRow> byWorkspace = new LinkedHashMap<>();
    if (!members.isEmpty()) {
      Map<UUID, MemberRow> byUser = new LinkedHashMap<>();
      members.forEach(m -> byUser.put(m.userId(), m));
      db.list(
          "SELECT workspace_id, user_id FROM workspace_members WHERE user_id = ANY(?)",
          rs -> {
            byWorkspace.put(rs.getObject(1, UUID.class), byUser.get(rs.getObject(2, UUID.class)));
            return null;
          },
          List.copyOf(byUser.keySet()));
    }
    return new Scope(h, members, byWorkspace);
  }

  private List<String> notSharing(HouseholdRow h, java.util.function.Predicate<MemberRow> shares) {
    return households.members(h.id()).stream()
        .filter(m -> "ACTIVE".equals(m.status()) && !shares.test(m))
        .map(MemberRow::name)
        .toList();
  }

  private static List<MemberAmount> amounts(Scope scope, Map<UUID, Long> perMember) {
    List<MemberAmount> out = new ArrayList<>();
    for (MemberRow m : scope.members()) {
      out.add(
          new MemberAmount(
              m.id(), m.name(), perMember == null ? 0 : perMember.getOrDefault(m.id(), 0L)));
    }
    return out;
  }

  private long convert(long minor, String from, String to, Set<String> missing) {
    if (from.equals(to)) return minor;
    var converted = fx.convert(minor, from, to);
    if (converted.isEmpty()) {
      missing.add(from);
      return 0;
    }
    return converted.getAsLong();
  }
}

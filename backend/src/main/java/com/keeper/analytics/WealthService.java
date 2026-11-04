package com.keeper.analytics;

import com.keeper.common.db.Db;
import com.keeper.fx.FxConverter;
import com.keeper.investment.HoldingRefresher;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.UUID;

/** Balances, investments, loans and goals over time, all in the workspace's base currency. */
@Singleton
public class WealthService {

  @Serdeable
  public record AccountSeries(UUID id, String name, String type, List<Long> values) {}

  /** Month-end balance of every account, plus investments and own-value assets (gold, land...). */
  @Serdeable
  public record Wealth(
      String currency,
      List<String> months,
      List<AccountSeries> accounts,
      List<Long> investments,
      List<Long> ownAssets,
      List<String> missingCurrencies) {}

  @Serdeable
  public record HoldingNow(
      UUID id, String name, String symbol, String assetType, long costMinor, long valueMinor) {}

  @Serdeable
  public record LotPoint(UUID holdingId, String name, LocalDate boughtOn, long costMinor) {}

  @Serdeable
  public record ValuePoint(LocalDate date, long minor) {}

  @Serdeable
  public record HoldingValue(UUID holdingId, String name, LocalDate asOf, long valueMinor) {}

  @Serdeable
  public record Investments(
      String currency,
      List<HoldingNow> holdings,
      List<LotPoint> lots,
      List<ValuePoint> invested,
      List<ValuePoint> value,
      List<HoldingValue> ownValues,
      List<String> missingCurrencies) {}

  @Serdeable
  public record LoanMonth(String month, long owedToMeMinor, long iOweMinor) {}

  @Serdeable
  public record LoanPerson(
      String person,
      long lentMinor,
      long lentRepaidMinor,
      long borrowedMinor,
      long borrowedRepaidMinor) {}

  @Serdeable
  public record Loans(
      String currency,
      List<LoanMonth> history,
      List<LoanPerson> people,
      List<String> missingCurrencies) {}

  @Serdeable
  public record GoalPoint(LocalDate date, long cumulativeMinor) {}

  @Serdeable
  public record GoalProgress(
      UUID id,
      String name,
      String currency,
      long targetMinor,
      LocalDate targetDate,
      long savedMinor,
      List<GoalPoint> points) {}

  private final Db db;
  private final FxConverter fx;

  public WealthService(Db db, FxConverter fx) {
    this.db = db;
    this.fx = fx;
  }

  private record Acc(UUID id, String name, String type, String currency, long start) {}

  public Wealth wealth(UUID ws, int months) {
    var converter = fx.forWorkspace(ws);
    YearMonth last = YearMonth.now();
    YearMonth first = last.minusMonths(months - 1L);
    List<String> labels = new ArrayList<>();
    for (YearMonth m = first; !m.isAfter(last); m = m.plusMonths(1)) labels.add(m.toString());

    List<Acc> accounts =
        db.list(
            "SELECT a.id, a.name, a.type, a.currency, a.opening_balance_minor + COALESCE((SELECT SUM(t.direction * t.amount_minor) "
                + "FROM transactions t WHERE t.account_id = a.id AND t.deleted_at IS NULL AND t.occurred_on < ?), 0) "
                + "FROM accounts a WHERE a.workspace_id = ? AND NOT a.memo ORDER BY a.sort_order, a.name",
            rs ->
                new Acc(
                    rs.getObject(1, UUID.class),
                    rs.getString(2),
                    rs.getString(3),
                    rs.getString(4),
                    rs.getLong(5)),
            first.atDay(1),
            ws);

    Map<UUID, Map<String, Long>> deltas = new LinkedHashMap<>();
    db.list(
        "SELECT account_id, to_char(date_trunc('month', occurred_on), 'YYYY-MM'), SUM(direction * amount_minor) "
            + "FROM transactions WHERE workspace_id = ? AND deleted_at IS NULL AND occurred_on >= ? GROUP BY 1, 2",
        rs -> {
          deltas
              .computeIfAbsent(rs.getObject(1, UUID.class), k -> new LinkedHashMap<>())
              .put(rs.getString(2), rs.getLong(3));
          return null;
        },
        ws,
        first.atDay(1));

    List<AccountSeries> series = new ArrayList<>();
    for (Acc a : accounts) {
      long running = a.start();
      List<Long> values = new ArrayList<>();
      for (String m : labels) {
        running += deltas.getOrDefault(a.id(), Map.of()).getOrDefault(m, 0L);
        values.add(converter.toBase(running, a.currency()));
      }
      series.add(new AccountSeries(a.id(), a.name(), a.type(), values));
    }

    // Holdings: past months at what was paid (from purchase dates), this month at market value.
    long[][] held = new long[2][labels.size()]; // [0] market, [1] own-value
    Map<String, long[]> bought = new TreeMap<>();
    db.list(
        "SELECT h.currency, (h.asset_type IN "
            + HoldingRefresher.OWN_VALUE_KINDS
            + ") AS own, to_char(date_trunc('month', l.bought_on), 'YYYY-MM'), SUM(l.cost_minor) "
            + "FROM holding_lots l JOIN holdings h ON h.id = l.holding_id WHERE l.workspace_id = ? GROUP BY 1, 2, 3",
        rs -> {
          long inBase = converter.toBase(rs.getLong(4), rs.getString(1));
          bought
                  .computeIfAbsent(rs.getString(3), k -> new long[2])[
                  Boolean.TRUE.equals(rs.getObject(2)) ? 1 : 0] +=
              inBase;
          return null;
        },
        ws);
    long[] paid = new long[2];
    bought.forEach(
        (m, v) -> {
          if (m.compareTo(first.toString()) < 0) {
            paid[0] += v[0];
            paid[1] += v[1];
          }
        });
    for (int i = 0; i < labels.size(); i++) {
      long[] added = bought.getOrDefault(labels.get(i), new long[2]);
      paid[0] += added[0];
      paid[1] += added[1];
      held[0][i] = paid[0];
      held[1][i] = paid[1];
    }
    int end = labels.size() - 1;
    held[0][end] = 0;
    held[1][end] = 0;
    db.list(
        "SELECT currency, COALESCE(asset_type IN "
            + HoldingRefresher.OWN_VALUE_KINDS
            + ", FALSE), SUM(ROUND(quantity * price_minor))::bigint FROM holdings WHERE workspace_id = ? GROUP BY 1, 2",
        rs -> {
          held[rs.getBoolean(2) ? 1 : 0][end] += converter.toBase(rs.getLong(3), rs.getString(1));
          return null;
        },
        ws);

    return new Wealth(
        converter.base(),
        labels,
        series,
        java.util.Arrays.stream(held[0]).boxed().toList(),
        java.util.Arrays.stream(held[1]).boxed().toList(),
        List.copyOf(converter.missing()));
  }

  public Investments investments(UUID ws) {
    var converter = fx.forWorkspace(ws);
    String own = HoldingRefresher.OWN_VALUE_KINDS;

    List<HoldingNow> holdings =
        db.list(
            "SELECT id, name, symbol, asset_type, currency, cost_basis_minor, ROUND(quantity * price_minor)::bigint, "
                + "COALESCE(asset_type IN "
                + own
                + ", FALSE) FROM holdings WHERE workspace_id = ? ORDER BY name",
            rs ->
                new HoldingNow(
                    rs.getObject(1, UUID.class),
                    rs.getString(2),
                    rs.getString(3),
                    rs.getString(4),
                    converter.toBase(rs.getLong(6), rs.getString(5)),
                    converter.toBase(rs.getLong(7), rs.getString(5))),
            ws);

    List<LotPoint> lots =
        db.list(
            "SELECT l.holding_id, h.name, l.bought_on, l.cost_minor, h.currency FROM holding_lots l "
                + "JOIN holdings h ON h.id = l.holding_id WHERE l.workspace_id = ? AND NOT COALESCE(h.asset_type IN "
                + own
                + ", FALSE) ORDER BY l.bought_on",
            rs ->
                new LotPoint(
                    rs.getObject(1, UUID.class),
                    rs.getString(2),
                    rs.getObject(3, LocalDate.class),
                    converter.toBase(rs.getLong(4), rs.getString(5))),
            ws);
    List<ValuePoint> invested = new ArrayList<>();
    long running = 0;
    for (LotPoint l : lots) {
      running += l.costMinor();
      invested.add(new ValuePoint(l.boughtOn(), running));
    }

    record Hist(UUID id, String name, LocalDate asOf, long value, boolean own) {}
    List<Hist> history =
        db.list(
            "SELECT v.holding_id, h.name, v.as_of, v.value_minor, h.currency, COALESCE(h.asset_type IN "
                + own
                + ", FALSE) FROM holding_values v JOIN holdings h ON h.id = v.holding_id "
                + "WHERE v.workspace_id = ? ORDER BY v.as_of",
            rs ->
                new Hist(
                    rs.getObject(1, UUID.class),
                    rs.getString(2),
                    rs.getObject(3, LocalDate.class),
                    converter.toBase(rs.getLong(4), rs.getString(5)),
                    rs.getBoolean(6)),
            ws);

    // Total market value per day: each holding keeps its last known value until it changes.
    TreeSet<LocalDate> days = new TreeSet<>();
    history.stream().filter(h -> !h.own()).forEach(h -> days.add(h.asOf()));
    Map<UUID, Long> latest = new LinkedHashMap<>();
    Map<LocalDate, List<Hist>> byDay = new TreeMap<>();
    history.stream()
        .filter(h -> !h.own())
        .forEach(h -> byDay.computeIfAbsent(h.asOf(), k -> new ArrayList<>()).add(h));
    List<ValuePoint> value = new ArrayList<>();
    for (LocalDate d : days) {
      byDay.get(d).forEach(h -> latest.put(h.id(), h.value()));
      value.add(new ValuePoint(d, latest.values().stream().mapToLong(Long::longValue).sum()));
    }

    List<HoldingValue> ownValues =
        history.stream()
            .filter(Hist::own)
            .map(h -> new HoldingValue(h.id(), h.name(), h.asOf(), h.value()))
            .toList();

    return new Investments(
        converter.base(),
        holdings,
        lots,
        invested,
        value,
        ownValues,
        List.copyOf(converter.missing()));
  }

  public Loans loans(UUID ws, int months) {
    var converter = fx.forWorkspace(ws);
    record L(UUID id, String person, boolean lent, long principal, String currency, LocalDate on) {}
    List<L> loans =
        db.list(
            "SELECT id, person, direction = 'LENT', principal_minor, currency, occurred_on FROM loans "
                + "WHERE workspace_id = ? AND deleted_at IS NULL",
            rs ->
                new L(
                    rs.getObject(1, UUID.class),
                    rs.getString(2),
                    rs.getBoolean(3),
                    rs.getLong(4),
                    rs.getString(5),
                    rs.getObject(6, LocalDate.class)),
            ws);
    record R(UUID loan, LocalDate on, long amount) {}
    List<R> repayments =
        db.list(
            "SELECT t.loan_id, t.occurred_on, t.amount_minor FROM transactions t JOIN loans l ON l.id = t.loan_id "
                + "WHERE t.workspace_id = ? AND t.deleted_at IS NULL AND l.deleted_at IS NULL "
                + "AND ((l.direction = 'LENT' AND t.type = 'INCOME') OR (l.direction = 'BORROWED' AND t.type = 'EXPENSE'))",
            rs ->
                new R(rs.getObject(1, UUID.class), rs.getObject(2, LocalDate.class), rs.getLong(3)),
            ws);
    Map<UUID, L> byId = new LinkedHashMap<>();
    loans.forEach(l -> byId.put(l.id(), l));

    YearMonth last = YearMonth.now();
    List<LoanMonth> history = new ArrayList<>();
    for (YearMonth m = last.minusMonths(months - 1L); !m.isAfter(last); m = m.plusMonths(1)) {
      LocalDate end = m.atEndOfMonth();
      long owed = 0;
      long owe = 0;
      for (L l : loans) {
        if (l.on().isAfter(end)) continue;
        long paid =
            repayments.stream()
                .filter(r -> r.loan().equals(l.id()) && !r.on().isAfter(end))
                .mapToLong(R::amount)
                .sum();
        long open = converter.toBase(Math.max(0, l.principal() - paid), l.currency());
        if (l.lent()) owed += open;
        else owe += open;
      }
      history.add(new LoanMonth(m.toString(), owed, owe));
    }

    Map<String, long[]> byPerson = new LinkedHashMap<>();
    Map<String, String> display = new LinkedHashMap<>();
    for (L l : loans) {
      String key = l.person().toLowerCase();
      display.putIfAbsent(key, l.person());
      long[] slot = byPerson.computeIfAbsent(key, k -> new long[4]);
      slot[l.lent() ? 0 : 2] += converter.toBase(l.principal(), l.currency());
    }
    for (R r : repayments) {
      L l = byId.get(r.loan());
      long[] slot = byPerson.get(l.person().toLowerCase());
      slot[l.lent() ? 1 : 3] += converter.toBase(r.amount(), l.currency());
    }
    List<LoanPerson> people =
        byPerson.entrySet().stream()
            .map(
                e ->
                    new LoanPerson(
                        display.get(e.getKey()),
                        e.getValue()[0],
                        e.getValue()[1],
                        e.getValue()[2],
                        e.getValue()[3]))
            .sorted(
                java.util.Comparator.comparingLong(
                        (LoanPerson p) -> p.lentMinor() + p.borrowedMinor())
                    .reversed())
            .toList();
    return new Loans(converter.base(), history, people, List.copyOf(converter.missing()));
  }

  public List<GoalProgress> goals(UUID ws) {
    record G(UUID id, String name, String currency, long target, LocalDate date) {}
    List<G> goals =
        db.list(
            "SELECT id, name, currency, target_minor, target_date FROM goals WHERE workspace_id = ? AND archived_at IS NULL ORDER BY created_at",
            rs ->
                new G(
                    rs.getObject(1, UUID.class),
                    rs.getString(2),
                    rs.getString(3),
                    rs.getLong(4),
                    rs.getObject(5, LocalDate.class)),
            ws);
    List<GoalProgress> out = new ArrayList<>();
    for (G g : goals) {
      List<GoalPoint> points = new ArrayList<>();
      long[] running = {0};
      db.list(
          "SELECT occurred_on, SUM(amount_minor) FROM goal_contributions WHERE goal_id = ? GROUP BY 1 ORDER BY 1",
          rs -> {
            running[0] += rs.getLong(2);
            points.add(new GoalPoint(rs.getObject(1, LocalDate.class), running[0]));
            return null;
          },
          g.id());
      out.add(
          new GoalProgress(
              g.id(), g.name(), g.currency(), g.target(), g.date(), running[0], points));
    }
    return out;
  }
}

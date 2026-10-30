package com.keeper.household;

import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.ForbiddenException;
import com.keeper.common.exception.ResourceNotFoundException;
import com.keeper.transaction.Normaliser;
import com.keeper.workspace.WorkspaceRepository;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Who spent what in a household, running balances, and settle-up. Equal split among current
 * members.
 */
@Singleton
public class HouseholdSummaryService {

  @Serdeable
  public record MemberStat(
      UUID userId,
      String name,
      long paidMinor,
      int sharePercent,
      long fairShareMinor,
      long balanceMinor) {}

  @Serdeable
  public record MemberAmount(UUID userId, String name, long amountMinor) {}

  @Serdeable
  public record CategoryStat(
      UUID categoryId, String name, String color, long totalMinor, List<MemberAmount> byMember) {}

  @Serdeable
  public record MonthShare(String month, List<MemberAmount> byMember) {}

  @Serdeable
  public record Payment(
      UUID fromUserId, String fromName, UUID toUserId, String toName, long amountMinor) {}

  @Serdeable
  public record SettlementView(
      UUID id,
      UUID fromUserId,
      String fromName,
      UUID toUserId,
      String toName,
      long amountMinor,
      LocalDate occurredOn,
      String note) {}

  @Serdeable
  public record Summary(
      String month,
      String currency,
      long totalMinor,
      List<MemberStat> members,
      List<MemberStat> balances,
      List<CategoryStat> categories,
      List<MonthShare> trend,
      List<Payment> suggested,
      List<SettlementView> settlements) {}

  private static final String EXPENSE_FILTER =
      "t.workspace_id = ? AND t.type = 'EXPENSE' AND t.deleted_at IS NULL AND t.loan_id IS NULL AND t.base_amount_minor IS NOT NULL";

  private final Db db;
  private final WorkspaceRepository workspaces;
  private final Normaliser normaliser;

  public HouseholdSummaryService(Db db, WorkspaceRepository workspaces, Normaliser normaliser) {
    this.db = db;
    this.workspaces = workspaces;
    this.normaliser = normaliser;
  }

  public Summary summary(UUID ws, YearMonth month) {
    requireHousehold(ws);
    var members = workspaces.members(ws);
    Map<UUID, String> names = new LinkedHashMap<>();
    members.forEach(m -> names.put(m.userId(), m.name()));
    int n = Math.max(1, members.size());
    LocalDate from = month.atDay(1);
    LocalDate to = month.atEndOfMonth();

    Map<UUID, Long> monthPaid = paidBy(ws, from, to);
    Map<UUID, Long> allPaid = paidBy(ws, LocalDate.of(1970, 1, 1), LocalDate.of(2999, 1, 1));
    long monthTotal = monthPaid.values().stream().mapToLong(Long::longValue).sum();
    long allTotal = allPaid.values().stream().mapToLong(Long::longValue).sum();

    List<SettlementView> settlements = settlements(ws);
    Map<UUID, Long> settleNet = new HashMap<>();
    for (var s : settlements) {
      settleNet.merge(s.fromUserId(), s.amountMinor(), Long::sum);
      settleNet.merge(s.toUserId(), -s.amountMinor(), Long::sum);
    }

    List<MemberStat> monthStats = new ArrayList<>();
    List<MemberStat> balances = new ArrayList<>();
    long monthFair = monthTotal / n;
    long fair = allTotal / n;
    for (UUID id : names.keySet()) {
      long paid = monthPaid.getOrDefault(id, 0L);
      monthStats.add(
          new MemberStat(
              id, names.get(id), paid, pct(paid, monthTotal), monthFair, paid - monthFair));
      long all = allPaid.getOrDefault(id, 0L);
      balances.add(
          new MemberStat(
              id,
              names.get(id),
              all,
              pct(all, allTotal),
              fair,
              all - fair + settleNet.getOrDefault(id, 0L)));
    }

    return new Summary(
        month.toString(),
        normaliser.baseCurrency(ws),
        monthTotal,
        monthStats,
        balances,
        categories(ws, from, to, names),
        trend(ws, month, names),
        suggest(balances),
        settlements);
  }

  // ---------- settlements ----------

  public SettlementView settle(
      UUID ws, UUID from, UUID to, long amountMinor, LocalDate date, String note) {
    requireHousehold(ws);
    if (from.equals(to)) throw new BadRequestException("Choose someone else");
    if (workspaces.roleOf(ws, to).isEmpty())
      throw new BadRequestException("That person is not in this household");
    UUID id = UUID.randomUUID();
    db.update(
        "INSERT INTO settlements(id, workspace_id, from_user, to_user, amount_minor, occurred_on, note, created_by) VALUES (?,?,?,?,?,?,?,?)",
        id,
        ws,
        from,
        to,
        amountMinor,
        date,
        note == null || note.isBlank() ? null : note.trim(),
        from);
    return settlements(ws).stream().filter(s -> s.id().equals(id)).findFirst().orElseThrow();
  }

  public void removeSettlement(UUID ws, UUID actor, UUID id) {
    UUID creator =
        db.one(
                "SELECT created_by FROM settlements WHERE workspace_id = ? AND id = ?",
                rs -> rs.getObject(1, UUID.class),
                ws,
                id)
            .orElseThrow(() -> new ResourceNotFoundException("Settlement", id.toString()));
    if (!creator.equals(actor))
      throw new ForbiddenException("Only the person who recorded it can remove it");
    db.update("DELETE FROM settlements WHERE id = ?", id);
  }

  private List<SettlementView> settlements(UUID ws) {
    return db.list(
        "SELECT s.id, s.from_user, f.name, s.to_user, t.name, s.amount_minor, s.occurred_on, s.note FROM settlements s "
            + "JOIN users f ON f.id = s.from_user JOIN users t ON t.id = s.to_user WHERE s.workspace_id = ? "
            + "ORDER BY s.occurred_on DESC, s.created_at DESC",
        rs ->
            new SettlementView(
                rs.getObject(1, UUID.class),
                rs.getObject(2, UUID.class),
                rs.getString(3),
                rs.getObject(4, UUID.class),
                rs.getString(5),
                rs.getLong(6),
                rs.getObject(7, LocalDate.class),
                rs.getString(8)),
        ws);
  }

  /** Fewest-ish payments that clear every balance: the biggest debtor pays the biggest creditor. */
  static List<Payment> suggest(List<MemberStat> balances) {
    List<long[]> debtors = new ArrayList<>();
    List<long[]> creditors = new ArrayList<>();
    Map<Integer, MemberStat> byIndex = new HashMap<>();
    for (int i = 0; i < balances.size(); i++) {
      byIndex.put(i, balances.get(i));
      long b = balances.get(i).balanceMinor();
      if (b < 0) debtors.add(new long[] {i, -b});
      else if (b > 0) creditors.add(new long[] {i, b});
    }
    debtors.sort(Comparator.comparingLong((long[] a) -> a[1]).reversed());
    creditors.sort(Comparator.comparingLong((long[] a) -> a[1]).reversed());
    List<Payment> out = new ArrayList<>();
    int d = 0;
    int c = 0;
    while (d < debtors.size() && c < creditors.size()) {
      long pay = Math.min(debtors.get(d)[1], creditors.get(c)[1]);
      if (pay > 0) {
        MemberStat from = byIndex.get((int) debtors.get(d)[0]);
        MemberStat to = byIndex.get((int) creditors.get(c)[0]);
        out.add(new Payment(from.userId(), from.name(), to.userId(), to.name(), pay));
      }
      debtors.get(d)[1] -= pay;
      creditors.get(c)[1] -= pay;
      if (debtors.get(d)[1] == 0) d++;
      if (creditors.get(c)[1] == 0) c++;
    }
    return out;
  }

  // ---------- queries ----------

  private Map<UUID, Long> paidBy(UUID ws, LocalDate from, LocalDate to) {
    Map<UUID, Long> out = new HashMap<>();
    db.list(
        "SELECT t.created_by, SUM(t.base_amount_minor) FROM transactions t WHERE "
            + EXPENSE_FILTER
            + " AND t.occurred_on BETWEEN ? AND ? GROUP BY 1",
        rs -> {
          out.put(rs.getObject(1, UUID.class), rs.getLong(2));
          return null;
        },
        ws,
        from,
        to);
    return out;
  }

  private List<CategoryStat> categories(
      UUID ws, LocalDate from, LocalDate to, Map<UUID, String> names) {
    Map<UUID, CategoryStat> byCat = new LinkedHashMap<>();
    UUID none = new UUID(0, 0);
    db.list(
        "SELECT g.id, COALESCE(g.name, 'Uncategorized'), g.color, t.created_by, SUM(t.base_amount_minor) FROM transactions t "
            + "LEFT JOIN categories c ON c.id = t.category_id LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) WHERE "
            + EXPENSE_FILTER
            + " AND t.occurred_on BETWEEN ? AND ? GROUP BY 1, 2, 3, 4",
        rs -> {
          UUID key = rs.getObject(1, UUID.class) == null ? none : rs.getObject(1, UUID.class);
          UUID who = rs.getObject(4, UUID.class);
          long amount = rs.getLong(5);
          CategoryStat cur = byCat.get(key);
          List<MemberAmount> list =
              cur == null ? new ArrayList<>() : new ArrayList<>(cur.byMember());
          list.add(new MemberAmount(who, names.getOrDefault(who, "Former member"), amount));
          byCat.put(
              key,
              new CategoryStat(
                  key.equals(none) ? null : key,
                  rs.getString(2),
                  rs.getString(3),
                  (cur == null ? 0 : cur.totalMinor()) + amount,
                  list));
          return null;
        },
        ws,
        from,
        to);
    return byCat.values().stream()
        .sorted(Comparator.comparingLong(CategoryStat::totalMinor).reversed())
        .toList();
  }

  private List<MonthShare> trend(UUID ws, YearMonth month, Map<UUID, String> names) {
    Map<String, List<MemberAmount>> byMonth = new LinkedHashMap<>();
    for (int i = 5; i >= 0; i--) byMonth.put(month.minusMonths(i).toString(), new ArrayList<>());
    db.list(
        "SELECT to_char(date_trunc('month', t.occurred_on), 'YYYY-MM'), t.created_by, SUM(t.base_amount_minor) FROM transactions t WHERE "
            + EXPENSE_FILTER
            + " AND t.occurred_on BETWEEN ? AND ? GROUP BY 1, 2",
        rs -> {
          var list = byMonth.get(rs.getString(1));
          if (list != null) {
            UUID who = rs.getObject(2, UUID.class);
            list.add(
                new MemberAmount(who, names.getOrDefault(who, "Former member"), rs.getLong(3)));
          }
          return null;
        },
        ws,
        month.minusMonths(5).atDay(1),
        month.atEndOfMonth());
    List<MonthShare> out = new ArrayList<>();
    byMonth.forEach((m, l) -> out.add(new MonthShare(m, l)));
    return out;
  }

  private static int pct(long part, long total) {
    return total <= 0 ? 0 : (int) Math.round(part * 100.0 / total);
  }

  private void requireHousehold(UUID ws) {
    String kind =
        db.one("SELECT kind FROM workspaces WHERE id = ?", rs -> rs.getString(1), ws)
            .orElse("PERSONAL");
    if (!"SHARED".equals(kind))
      throw new BadRequestException("This workspace is not a shared ledger");
  }
}

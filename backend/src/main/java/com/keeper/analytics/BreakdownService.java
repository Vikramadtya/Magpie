package com.keeper.analytics;

import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.fx.FxConverter;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * One flexible report behind most charts: money grouped by a dimension (category, payee, account,
 * weekday, ...) and optionally by day or month. Everything is a SQL GROUP BY over the caller's own
 * transactions, in the base currency.
 */
@Singleton
public class BreakdownService {

  @Serdeable
  public record Row(
      String bucket, String key, String label, String color, long totalMinor, int count) {}

  @Serdeable
  public record Result(String currency, List<Row> rows, List<String> missingCurrencies) {}

  /** What to chart; null filters mean "any". */
  public record Query(
      String by,
      String bucket,
      LocalDate from,
      LocalDate to,
      String type,
      UUID categoryId,
      UUID accountId,
      UUID payeeId,
      UUID tagId,
      UUID tripId,
      UUID personId,
      int limit) {}

  /** How a dimension is read from a transaction row t: id, label, colour and any extra joins. */
  private record Dim(String key, String label, String color, String joins) {}

  private static final Map<String, Dim> DIMS =
      Map.ofEntries(
          Map.entry("none", new Dim("'all'", "'Total'", "NULL", "")),
          Map.entry(
              "category",
              new Dim(
                  "COALESCE(g.id::text, '')",
                  "COALESCE(g.name, 'Uncategorised')",
                  "g.color",
                  "LEFT JOIN categories c ON c.id = t.category_id "
                      + "LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id)")),
          Map.entry(
              "subcategory",
              new Dim(
                  "COALESCE(c.id::text, '')",
                  "COALESCE(c.name, 'Uncategorised')",
                  "COALESCE(c.color, p.color)",
                  "LEFT JOIN categories c ON c.id = t.category_id "
                      + "LEFT JOIN categories p ON p.id = c.parent_id")),
          Map.entry(
              "payee",
              new Dim(
                  "COALESCE(py.id::text, '')",
                  "COALESCE(py.name, 'No payee')",
                  "NULL",
                  "LEFT JOIN payees py ON py.id = t.payee_id")),
          Map.entry(
              "account",
              new Dim("a.id::text", "a.name", "NULL", "JOIN accounts a ON a.id = t.account_id")),
          Map.entry(
              "tag",
              new Dim(
                  "COALESCE(tg.id::text, '')",
                  "COALESCE(tg.name, 'No tag')",
                  "tg.color",
                  "LEFT JOIN transaction_tags tt ON tt.transaction_id = t.id "
                      + "LEFT JOIN tags tg ON tg.id = tt.tag_id")),
          Map.entry(
              "trip",
              new Dim("tr.id::text", "tr.name", "NULL", "JOIN trips tr ON tr.id = t.trip_id")),
          Map.entry(
              "person",
              new Dim("pe.id::text", "pe.name", "NULL", "JOIN people pe ON pe.id = t.spent_by")),
          Map.entry("currency", new Dim("t.currency", "t.currency", "NULL", "")),
          Map.entry(
              "weekday",
              new Dim(
                  "EXTRACT(ISODOW FROM t.occurred_on)::int::text",
                  "EXTRACT(ISODOW FROM t.occurred_on)::int::text",
                  "NULL",
                  "")),
          Map.entry(
              "daypart",
              new Dim(
                  "LEAST((EXTRACT(DAY FROM t.occurred_on)::int - 1) / 7, 3)::text",
                  "LEAST((EXTRACT(DAY FROM t.occurred_on)::int - 1) / 7, 3)::text",
                  "NULL",
                  "")),
          Map.entry(
              "kind",
              new Dim(
                  "CASE WHEN t.recurring_rule_id IS NULL THEN 'everyday' ELSE 'recurring' END",
                  "CASE WHEN t.recurring_rule_id IS NULL THEN 'Everyday' ELSE 'Recurring' END",
                  "NULL",
                  "")));

  private static final Map<String, String> BUCKETS =
      Map.of(
          "none", "'all'",
          "day", "to_char(t.occurred_on, 'YYYY-MM-DD')",
          "month", "to_char(t.occurred_on, 'YYYY-MM')");

  private final Db db;
  private final FxConverter fx;
  private final MissingRates missing;

  public BreakdownService(Db db, FxConverter fx, MissingRates missing) {
    this.db = db;
    this.fx = fx;
    this.missing = missing;
  }

  public Result run(UUID ws, Query q) {
    Dim dim = DIMS.get(q.by());
    String bucket = BUCKETS.get(q.bucket());
    if (dim == null) throw new BadRequestException("Unknown grouping: " + q.by());
    if (bucket == null) throw new BadRequestException("Unknown bucket: " + q.bucket());
    if (!"EXPENSE".equals(q.type()) && !"INCOME".equals(q.type()))
      throw new BadRequestException("type must be EXPENSE or INCOME");

    List<Object> args = new ArrayList<>();
    StringBuilder where =
        new StringBuilder(
            "t.workspace_id = ? AND t.type = ? AND t.deleted_at IS NULL AND t.loan_id IS NULL "
                + "AND t.base_amount_minor IS NOT NULL AND t.occurred_on BETWEEN ? AND ?");
    args.add(ws);
    args.add(q.type());
    args.add(q.from());
    args.add(q.to());
    // "By person" is the one view of what others spent; everything else is your own money.
    if ("person".equals(q.by())) {
      if (q.personId() != null) {
        where.append(" AND t.spent_by = ?");
        args.add(q.personId());
      }
    } else if (q.personId() != null) {
      where.append(" AND t.spent_by = ?");
      args.add(q.personId());
    } else {
      where.append(" AND t.spent_by IS NULL");
    }
    if (q.categoryId() != null) {
      where.append(
          " AND t.category_id IN (SELECT id FROM categories WHERE id = ? OR parent_id = ?)");
      args.add(q.categoryId());
      args.add(q.categoryId());
    }
    if (q.accountId() != null) {
      where.append(" AND t.account_id = ?");
      args.add(q.accountId());
    }
    if (q.payeeId() != null) {
      where.append(" AND t.payee_id = ?");
      args.add(q.payeeId());
    }
    if (q.tripId() != null) {
      where.append(" AND t.trip_id = ?");
      args.add(q.tripId());
    }
    if (q.tagId() != null) {
      where.append(
          " AND EXISTS (SELECT 1 FROM transaction_tags x WHERE x.transaction_id = t.id AND x.tag_id = ?)");
      args.add(q.tagId());
    }

    String sql =
        "SELECT "
            + bucket
            + ", "
            + dim.key()
            + ", "
            + dim.label()
            + ", "
            + dim.color()
            + ", SUM(t.base_amount_minor), COUNT(*) FROM transactions t "
            + dim.joins()
            + " WHERE "
            + where
            + " GROUP BY 1, 2, 3, 4";
    List<Row> rows =
        db.list(
            sql,
            rs ->
                new Row(
                    rs.getString(1),
                    rs.getString(2),
                    rs.getString(3),
                    rs.getString(4),
                    rs.getLong(5),
                    rs.getInt(6)),
            args.toArray());

    String base = fx.forWorkspace(ws).base();
    return new Result(
        base, capGroups(rows, q.limit(), q.by()), missing.currencies(ws, q.from(), q.to()));
  }

  /** Keeps the biggest groups and folds the rest into one "Everything else" per bucket. */
  static List<Row> capGroups(List<Row> rows, int limit, String by) {
    if (limit <= 0 || "weekday".equals(by) || "daypart".equals(by) || "kind".equals(by))
      return sorted(rows);
    Map<String, Long> totals = new LinkedHashMap<>();
    rows.forEach(r -> totals.merge(r.key(), r.totalMinor(), Long::sum));
    List<String> keep =
        totals.entrySet().stream()
            .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
            .limit(limit)
            .map(Map.Entry::getKey)
            .toList();
    if (keep.size() == totals.size()) return sorted(rows);
    List<Row> out = new ArrayList<>();
    Map<String, long[]> rest = new LinkedHashMap<>();
    for (Row r : rows) {
      if (keep.contains(r.key())) out.add(r);
      else {
        long[] slot = rest.computeIfAbsent(r.bucket(), k -> new long[2]);
        slot[0] += r.totalMinor();
        slot[1] += r.count();
      }
    }
    rest.forEach(
        (bucket, v) ->
            out.add(new Row(bucket, "other", "Everything else", null, v[0], (int) v[1])));
    return sorted(out);
  }

  private static List<Row> sorted(List<Row> rows) {
    return rows.stream()
        .sorted(
            Comparator.comparing(Row::bucket)
                .thenComparing(Comparator.comparingLong(Row::totalMinor).reversed()))
        .toList();
  }
}

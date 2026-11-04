package com.keeper.analytics;

import com.keeper.common.db.Db;
import com.keeper.fx.CurrencyUnits;
import com.keeper.fx.FxConverter;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Reports about individual purchases: how big they are, which are largest, and where they sit. */
@Singleton
public class DetailService {

  @Serdeable
  public record Bucket(Long fromMinor, Long toMinor, int count, long totalMinor) {}

  @Serdeable
  public record Sizes(String currency, List<Bucket> buckets, int total) {}

  @Serdeable
  public record Purchase(
      String id, LocalDate date, String title, String category, long amountMinor) {}

  @Serdeable
  public record Purchases(String currency, List<Purchase> items) {}

  @Serdeable
  public record Leaf(String category, String subcategory, String payee, long totalMinor) {}

  @Serdeable
  public record Tree(String currency, List<Leaf> leaves) {}

  private static final String OWN_SPEND =
      "t.workspace_id = ? AND t.type = 'EXPENSE' AND t.deleted_at IS NULL AND t.loan_id IS NULL "
          + "AND t.spent_by IS NULL AND t.base_amount_minor IS NOT NULL AND t.occurred_on BETWEEN ? AND ?";

  private final Db db;
  private final FxConverter fx;

  public DetailService(Db db, FxConverter fx) {
    this.db = db;
    this.fx = fx;
  }

  /** How many purchases are small, medium or large, using round-number edges from your own data. */
  public Sizes sizes(UUID ws, LocalDate from, LocalDate to) {
    String base = fx.forWorkspace(ws).base();
    List<Long> amounts =
        db.list(
            "SELECT t.base_amount_minor FROM transactions t WHERE "
                + OWN_SPEND
                + " AND t.base_amount_minor > 0 ORDER BY 1 LIMIT 100000",
            rs -> rs.getLong(1),
            ws,
            from,
            to);
    if (amounts.isEmpty()) return new Sizes(base, List.of(), 0);

    long low = amounts.get((int) Math.floor((amounts.size() - 1) * 0.02));
    long high = amounts.get((int) Math.ceil((amounts.size() - 1) * 0.98));
    long unit = (long) Math.pow(10, CurrencyUnits.exponent(base));
    List<Long> edges = new ArrayList<>();
    for (long scale = unit; scale <= high * 10 && scale > 0; scale *= 10)
      for (int m : new int[] {1, 2, 5}) {
        long edge = scale * m;
        if (edge > low && edge < high) edges.add(edge);
      }
    if (edges.size() > 9) edges.removeIf(e -> String.valueOf(e).charAt(0) == '2');
    while (edges.size() > 9) edges.remove(edges.size() / 2);

    List<Bucket> buckets = new ArrayList<>();
    for (int i = 0; i <= edges.size(); i++) {
      Long lo = i == 0 ? null : edges.get(i - 1);
      Long hi = i == edges.size() ? null : edges.get(i);
      int count = 0;
      long total = 0;
      for (long a : amounts)
        if ((lo == null || a >= lo) && (hi == null || a < hi)) {
          count++;
          total += a;
        }
      buckets.add(new Bucket(lo, hi, count, total));
    }
    return new Sizes(base, buckets, amounts.size());
  }

  public Purchases purchases(UUID ws, LocalDate from, LocalDate to, int limit) {
    String base = fx.forWorkspace(ws).base();
    List<Purchase> items =
        db.list(
            "SELECT t.id::text, t.occurred_on, COALESCE(py.name, c.name, 'Expense'), c.name, t.base_amount_minor "
                + "FROM transactions t LEFT JOIN payees py ON py.id = t.payee_id LEFT JOIN categories c ON c.id = t.category_id "
                + "WHERE "
                + OWN_SPEND
                + " ORDER BY t.base_amount_minor DESC LIMIT ?",
            rs ->
                new Purchase(
                    rs.getString(1),
                    rs.getObject(2, LocalDate.class),
                    rs.getString(3),
                    rs.getString(4),
                    rs.getLong(5)),
            ws,
            from,
            to,
            limit);
    return new Purchases(base, items);
  }

  /** Category, sub-category and payee together, for a treemap. */
  public Tree tree(UUID ws, LocalDate from, LocalDate to) {
    String base = fx.forWorkspace(ws).base();
    List<Leaf> leaves =
        db.list(
            "SELECT COALESCE(g.name, 'Uncategorised'), c.name, py.name, SUM(t.base_amount_minor) AS total "
                + "FROM transactions t LEFT JOIN categories c ON c.id = t.category_id "
                + "LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) LEFT JOIN payees py ON py.id = t.payee_id "
                + "WHERE "
                + OWN_SPEND
                + " GROUP BY 1, 2, 3 ORDER BY total DESC LIMIT 300",
            rs -> new Leaf(rs.getString(1), rs.getString(2), rs.getString(3), rs.getLong(4)),
            ws,
            from,
            to);
    return new Tree(base, leaves);
  }
}

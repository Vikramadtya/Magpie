package com.keeper.bills;

import com.keeper.common.db.Db;
import com.keeper.forecast.InsightsService;
import com.keeper.fx.FxConverter;
import com.keeper.recurring.RecurringService;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/**
 * A month of bills: what was paid, what is due, and what Keeper expects from charges it has
 * spotted.
 */
@Singleton
public class BillsService {

  /**
   * POSTED (already recorded), DUE (still to come), OVERDUE (past its date, not recorded), EXPECTED
   * (spotted, not tracked).
   */
  @Serdeable
  public record Item(
      LocalDate date,
      String name,
      String type,
      long amountMinor,
      String currency,
      String status,
      UUID ruleId) {}

  @Serdeable
  public record Calendar(String month, List<Item> items) {}

  private final Db db;
  private final RecurringService recurring;
  private final InsightsService insights;
  private final FxConverter fx;

  public BillsService(Db db, RecurringService recurring, InsightsService insights, FxConverter fx) {
    this.db = db;
    this.recurring = recurring;
    this.insights = insights;
    this.fx = fx;
  }

  public Calendar calendar(UUID ws, YearMonth month) {
    LocalDate first = month.atDay(1);
    LocalDate last = month.atEndOfMonth();
    LocalDate today = LocalDate.now();
    List<Item> items = new ArrayList<>();

    items.addAll(
        db.list(
            "SELECT t.occurred_on, r.name, t.type, t.amount_minor, t.currency, r.id FROM transactions t "
                + "JOIN recurring_rules r ON r.id = t.recurring_rule_id WHERE t.workspace_id = ? AND t.deleted_at IS NULL "
                + "AND t.occurred_on BETWEEN ? AND ?",
            rs ->
                new Item(
                    rs.getObject(1, LocalDate.class),
                    rs.getString(2),
                    rs.getString(3),
                    rs.getLong(4),
                    rs.getString(5),
                    "POSTED",
                    rs.getObject(6, UUID.class)),
            ws,
            first,
            last));

    // occurrences still ahead, or past their date and not yet recorded
    for (var u : recurring.occurrences(ws, first, last)) {
      boolean recorded =
          items.stream().anyMatch(i -> u.ruleId().equals(i.ruleId()) && u.date().equals(i.date()));
      if (recorded) continue;
      items.add(
          new Item(
              u.date(),
              u.name(),
              u.type(),
              u.amountMinor(),
              u.currency(),
              u.date().isBefore(today) ? "OVERDUE" : "DUE",
              u.ruleId()));
    }

    String base = fx.forWorkspace(ws).base();
    for (var s : insights.detectedSubscriptions(ws)) {
      if (!s.nextExpected().isBefore(first)
          && !s.nextExpected().isAfter(last)
          && !s.nextExpected().isBefore(today))
        items.add(
            new Item(
                s.nextExpected(), s.payee(), "EXPENSE", s.amountMinor(), base, "EXPECTED", null));
    }
    items.sort(Comparator.comparing(Item::date).thenComparing(Item::name));
    return new Calendar(month.toString(), items);
  }

  /** Charges that repeat but are not yet set up as recurring items. */
  public List<InsightsService.Subscription> suggestions(UUID ws) {
    return insights.detectedSubscriptions(ws);
  }
}

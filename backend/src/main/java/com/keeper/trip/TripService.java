package com.keeper.trip;

import com.keeper.common.db.Db;
import com.keeper.common.exception.BadRequestException;
import com.keeper.common.exception.ResourceNotFoundException;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Trips are personal: a dated container in your own ledger. Everything is counted in the ledger's
 * base currency at each day's rate, so a trip abroad shows what it really cost you at home.
 */
@Singleton
public class TripService {

  @Serdeable
  public record Trip(
      UUID id,
      String name,
      LocalDate startDate,
      LocalDate endDate,
      Long budgetMinor,
      String notes,
      long spentMinor,
      int expenseCount,
      int totalDays,
      int daysSoFar,
      String status,
      long perDayMinor) {}

  @Serdeable
  public record CategoryShare(
      UUID categoryId, String name, String color, long totalMinor, int percent) {}

  @Serdeable
  public record DaySpend(LocalDate date, long totalMinor) {}

  @Serdeable
  public record CurrencySpend(String currency, long localMinor, long baseMinor, int count) {}

  @Serdeable
  public record Purchase(
      UUID id,
      LocalDate date,
      String name,
      String category,
      long baseMinor,
      long localMinor,
      String localCurrency) {}

  @Serdeable
  public record Detail(
      Trip trip,
      String currency,
      /** Average daily spend in the 90 days before the trip, for comparison. */
      long normalDailyMinor,
      long projectedMinor,
      Long budgetRemainingMinor,
      long unassignedInRange,
      List<CategoryShare> categories,
      List<DaySpend> days,
      List<CurrencySpend> currencies,
      List<Purchase> largest,
      List<String> missingCurrencies) {}

  private static final String SPEND =
      "x.trip_id = ? AND x.workspace_id = ? AND x.deleted_at IS NULL AND x.type = 'EXPENSE' AND x.loan_id IS NULL ";

  private final TripRepository trips;
  private final Db db;

  public TripService(TripRepository trips, Db db) {
    this.trips = trips;
    this.db = db;
  }

  public List<Trip> list(UUID ws) {
    return trips.findAll(ws).stream().map(TripService::toTrip).toList();
  }

  public Trip create(UUID ws, TripController.Request r) {
    validate(r);
    return get(
        ws,
        trips.insert(
            ws, r.name().trim(), r.startDate(), r.endDate(), r.budgetMinor(), clean(r.notes())));
  }

  public Trip update(UUID ws, UUID id, TripController.Request r) {
    validate(r);
    if (trips.update(
            ws, id, r.name().trim(), r.startDate(), r.endDate(), r.budgetMinor(), clean(r.notes()))
        == 0) {
      throw new ResourceNotFoundException("Trip", id.toString());
    }
    return get(ws, id);
  }

  public void delete(UUID ws, UUID id) {
    trips.delete(ws, id); // expenses stay; they just lose the trip
  }

  public Trip get(UUID ws, UUID id) {
    return trips
        .find(ws, id)
        .map(TripService::toTrip)
        .orElseThrow(() -> new ResourceNotFoundException("Trip", id.toString()));
  }

  public Detail detail(UUID ws, UUID id) {
    Trip trip = get(ws, id);
    String base =
        db.one("SELECT base_currency FROM workspaces WHERE id = ?", rs -> rs.getString(1), ws)
            .orElse("USD");

    List<CategoryShare> categories =
        db.list(
            "SELECT g.id, COALESCE(g.name, 'Uncategorized'), g.color, SUM(x.base_amount_minor) FROM transactions x "
                + "LEFT JOIN categories c ON c.id = x.category_id LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) "
                + "WHERE "
                + SPEND
                + "AND x.base_amount_minor IS NOT NULL GROUP BY 1, 2, 3 ORDER BY 4 DESC",
            rs ->
                new CategoryShare(
                    rs.getObject(1, UUID.class),
                    rs.getString(2),
                    rs.getString(3),
                    rs.getLong(4),
                    trip.spentMinor() > 0
                        ? (int) Math.round(rs.getLong(4) * 100.0 / trip.spentMinor())
                        : 0),
            id,
            ws);

    List<DaySpend> days =
        db.list(
            "SELECT x.occurred_on, SUM(x.base_amount_minor) FROM transactions x WHERE "
                + SPEND
                + "AND x.base_amount_minor IS NOT NULL GROUP BY 1 ORDER BY 1",
            rs -> new DaySpend(rs.getObject(1, LocalDate.class), rs.getLong(2)),
            id,
            ws);

    List<CurrencySpend> currencies =
        db.list(
            "SELECT COALESCE(x.orig_currency, x.currency), SUM(COALESCE(x.orig_amount_minor, x.amount_minor)), "
                + "COALESCE(SUM(x.base_amount_minor), 0), COUNT(*) FROM transactions x WHERE "
                + SPEND
                + "GROUP BY 1 ORDER BY 3 DESC",
            rs -> new CurrencySpend(rs.getString(1), rs.getLong(2), rs.getLong(3), rs.getInt(4)),
            id,
            ws);

    List<Purchase> largest =
        db.list(
            "SELECT x.id, x.occurred_on, COALESCE(p.name, NULLIF(x.note, ''), COALESCE(g.name, 'Expense')), COALESCE(g.name, 'Uncategorized'), "
                + "x.base_amount_minor, COALESCE(x.orig_amount_minor, x.amount_minor), COALESCE(x.orig_currency, x.currency) FROM transactions x "
                + "LEFT JOIN payees p ON p.id = x.payee_id LEFT JOIN categories c ON c.id = x.category_id "
                + "LEFT JOIN categories g ON g.id = COALESCE(c.parent_id, c.id) WHERE "
                + SPEND
                + "AND x.base_amount_minor IS NOT NULL ORDER BY x.base_amount_minor DESC LIMIT 5",
            rs ->
                new Purchase(
                    rs.getObject(1, UUID.class),
                    rs.getObject(2, LocalDate.class),
                    rs.getString(3),
                    rs.getString(4),
                    rs.getLong(5),
                    rs.getLong(6),
                    rs.getString(7)),
            id,
            ws);

    List<String> missing =
        db.list(
            "SELECT DISTINCT x.currency FROM transactions x WHERE "
                + SPEND
                + "AND x.base_amount_minor IS NULL ORDER BY 1",
            rs -> rs.getString(1),
            id,
            ws);

    long normalDaily =
        db.one(
                "SELECT COALESCE(SUM(base_amount_minor), 0) / 90 FROM transactions WHERE workspace_id = ? AND type = 'EXPENSE' "
                    + "AND deleted_at IS NULL AND loan_id IS NULL AND trip_id IS NULL AND base_amount_minor IS NOT NULL "
                    + "AND occurred_on BETWEEN ? AND ?",
                rs -> rs.getLong(1),
                ws,
                trip.startDate().minusDays(90),
                trip.startDate().minusDays(1))
            .orElse(0L);

    boolean ongoing = "ONGOING".equals(trip.status());
    long projected = ongoing ? trip.perDayMinor() * trip.totalDays() : trip.spentMinor();
    Long remaining = trip.budgetMinor() == null ? null : trip.budgetMinor() - trip.spentMinor();
    return new Detail(
        trip,
        base,
        normalDaily,
        projected,
        remaining,
        trips.unassignedInRange(ws, trip.startDate(), trip.endDate()),
        categories,
        days,
        currencies,
        largest,
        missing);
  }

  // ---------- assigning expenses ----------

  public int assign(UUID ws, UUID tripId, List<UUID> ids) {
    get(ws, tripId);
    return trips.assign(ws, tripId, ids);
  }

  public int assignRange(UUID ws, UUID tripId) {
    Trip t = get(ws, tripId);
    return trips.assignRange(ws, tripId, t.startDate(), t.endDate());
  }

  public int unassign(UUID ws, List<UUID> ids) {
    return trips.unassign(ws, ids);
  }

  public int clear(UUID ws, UUID tripId) {
    get(ws, tripId);
    return trips.clear(ws, tripId);
  }

  // ---------- helpers ----------

  private static Trip toTrip(TripRepository.Row r) {
    LocalDate today = LocalDate.now();
    int total = (int) ChronoUnit.DAYS.between(r.startDate(), r.endDate()) + 1;
    String status =
        today.isBefore(r.startDate())
            ? "UPCOMING"
            : today.isAfter(r.endDate()) ? "PAST" : "ONGOING";
    int soFar =
        "UPCOMING".equals(status)
            ? 0
            : "PAST".equals(status)
                ? total
                : (int) ChronoUnit.DAYS.between(r.startDate(), today) + 1;
    long perDay = soFar > 0 ? r.spentMinor() / soFar : 0;
    return new Trip(
        r.id(),
        r.name(),
        r.startDate(),
        r.endDate(),
        r.budgetMinor(),
        r.notes(),
        r.spentMinor(),
        r.expenseCount(),
        total,
        soFar,
        status,
        perDay);
  }

  private static void validate(TripController.Request r) {
    if (r.endDate().isBefore(r.startDate()))
      throw new BadRequestException("The end date can't be before the start date");
    if (ChronoUnit.DAYS.between(r.startDate(), r.endDate()) > 366)
      throw new BadRequestException("A trip can last at most a year");
  }

  private static String clean(String s) {
    return s == null || s.isBlank() ? null : s.trim();
  }
}

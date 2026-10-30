package com.keeper.forecast;

import com.keeper.analytics.AnalyticsService;
import com.keeper.fx.FxConverter;
import com.keeper.recurring.RecurringRepository;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.inject.Singleton;
import java.text.NumberFormat;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Currency;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;

/** Spending patterns and plain-language foresights derived from the transaction history. */
@Singleton
public class InsightsService {

  @Serdeable
  public record Mover(
      UUID categoryId,
      String name,
      long thisMonthMinor,
      long usualMinor,
      long deltaMinor,
      int percent) {}

  @Serdeable
  public record Weekday(String day, long averageMinor, int sharePercent) {}

  @Serdeable
  public record WeekOfMonth(String label, long averageMinor) {}

  @Serdeable
  public record Anomaly(
      UUID id,
      LocalDate date,
      String name,
      String category,
      long amountMinor,
      long typicalMinor,
      int timesTypical) {}

  @Serdeable
  public record Subscription(
      String payee,
      long amountMinor,
      String frequency,
      LocalDate lastDate,
      LocalDate nextExpected,
      long perYearMinor,
      int charges) {}

  @Serdeable
  public record SavingsMonth(String month, int ratePercent, long incomeMinor, long expenseMinor) {}

  @Serdeable
  public record Growth(UUID categoryId, String name, int percentPerMonth, long latestMinor) {}

  @Serdeable
  public record Purchase(UUID id, LocalDate date, String name, String category, long amountMinor) {}

  @Serdeable
  public record Insights(
      String currency,
      List<String> highlights,
      List<Mover> movers,
      List<Weekday> weekdays,
      List<WeekOfMonth> weeksOfMonth,
      List<Anomaly> anomalies,
      List<Subscription> subscriptions,
      List<SavingsMonth> savings,
      List<Growth> growth,
      List<Purchase> largest) {}

  private final HistoryRepository history;
  private final RecurringRepository rules;
  private final AnalyticsService analytics;
  private final ForecastService forecasts;
  private final FxConverter fx;

  public InsightsService(
      HistoryRepository history,
      RecurringRepository rules,
      AnalyticsService analytics,
      ForecastService forecasts,
      FxConverter fx) {
    this.history = history;
    this.rules = rules;
    this.analytics = analytics;
    this.forecasts = forecasts;
    this.fx = fx;
  }

  public Insights insights(UUID ws) {
    String currency = fx.forWorkspace(ws).base();
    LocalDate today = LocalDate.now();
    YearMonth now = YearMonth.from(today);
    List<HistoryRepository.Row> rows = history.expenses(ws, now.minusMonths(12).atDay(1));

    List<Mover> movers = movers(rows, now, today);
    List<Weekday> weekdays = weekdays(rows, today);
    List<WeekOfMonth> weeks = weeksOfMonth(rows, now);
    List<Anomaly> anomalies = anomalies(rows, today);
    List<Subscription> subs = subscriptions(ws, rows, today);
    List<SavingsMonth> savings = savings(ws, now);
    List<Growth> growth = growth(rows, now);
    List<Purchase> largest =
        rows.stream()
            .filter(r -> YearMonth.from(r.date()).equals(now))
            .sorted(Comparator.comparingLong(HistoryRepository.Row::amountMinor).reversed())
            .limit(5)
            .map(r -> new Purchase(r.id(), r.date(), label(r), r.groupName(), r.amountMinor()))
            .toList();

    var forecast = forecasts.forecast(ws);
    List<String> highlights = new ArrayList<>();
    if (forecast.monthsOfHistory() >= 1) {
      highlights.add(
          "Next month you're likely to spend about %s (%s to %s). %s of that is already fixed by recurring bills."
              .formatted(
                  money(forecast.expense().totalMinor(), currency),
                  money(forecast.expense().lowMinor(), currency),
                  money(forecast.expense().highMinor(), currency),
                  money(forecast.expense().fixedMinor(), currency)));
    }
    var tm = forecast.thisMonth();
    if (tm.expectedMinor() > 0 && tm.spentMinor() > 0) {
      int pct =
          (int) Math.round((tm.projectedMinor() - tm.expectedMinor()) * 100.0 / tm.expectedMinor());
      highlights.add(
          "This month you've spent %s. At this pace you'll finish near %s, which is %s than usual."
              .formatted(
                  money(tm.spentMinor(), currency),
                  money(tm.projectedMinor(), currency),
                  Math.abs(pct) < 3
                      ? "about the same"
                      : Math.abs(pct) + "% " + (pct > 0 ? "more" : "less")));
    }
    movers.stream()
        .filter(m -> m.percent() >= 20)
        .findFirst()
        .ifPresent(
            m ->
                highlights.add(
                    "%s is %d%% above what you usually spend by this point in the month (+%s)."
                        .formatted(m.name(), m.percent(), money(m.deltaMinor(), currency))));
    weekdays.stream()
        .max(Comparator.comparingLong(Weekday::averageMinor))
        .filter(w -> w.averageMinor() > 0)
        .ifPresent(
            top -> {
              long low =
                  weekdays.stream()
                      .mapToLong(Weekday::averageMinor)
                      .filter(v -> v > 0)
                      .min()
                      .orElse(top.averageMinor());
              highlights.add(
                  "%s is your biggest spending day (about %s on average%s)."
                      .formatted(
                          top.day(),
                          money(top.averageMinor(), currency),
                          low > 0 && top.averageMinor() >= low * 2
                              ? ", over twice your quietest day"
                              : ""));
            });
    if (!subs.isEmpty()) {
      long perYear = subs.stream().mapToLong(Subscription::perYearMinor).sum();
      highlights.add(
          "%d possible subscription%s not in Recurring, costing about %s a year."
              .formatted(subs.size(), subs.size() == 1 ? "" : "s", money(perYear, currency)));
    }
    if (!anomalies.isEmpty()) {
      highlights.add(
          "%d unusually large purchase%s in the last 60 days."
              .formatted(anomalies.size(), anomalies.size() == 1 ? "" : "s"));
    }
    if (savings.size() >= 2) {
      var last = savings.get(savings.size() - 1);
      double avg =
          savings.stream()
              .skip(Math.max(0, savings.size() - 4))
              .limit(3)
              .mapToInt(SavingsMonth::ratePercent)
              .average()
              .orElse(last.ratePercent());
      highlights.add(
          "You saved %d%% of your income last month%s."
              .formatted(
                  last.ratePercent(),
                  Math.abs(last.ratePercent() - avg) >= 5
                      ? (last.ratePercent() > avg ? ", better than" : ", lower than")
                          + " your recent average of "
                          + Math.round(avg)
                          + "%"
                      : ""));
    }
    return new Insights(
        currency, highlights, movers, weekdays, weeks, anomalies, subs, savings, growth, largest);
  }

  // ---------- patterns ----------

  /** This month so far versus the average of the previous three months at the same point. */
  private List<Mover> movers(List<HistoryRepository.Row> rows, YearMonth now, LocalDate today) {
    double fraction = Math.max(1, today.getDayOfMonth()) / (double) now.lengthOfMonth();
    Map<UUID, long[]> byGroup = new LinkedHashMap<>();
    Map<UUID, String> names = new LinkedHashMap<>();
    UUID none = new UUID(0, 0);
    for (var r : rows) {
      YearMonth m = YearMonth.from(r.date());
      long monthsAgo = ChronoUnit.MONTHS.between(m, now);
      if (monthsAgo < 0 || monthsAgo > 3) continue;
      UUID key = r.groupId() == null ? none : r.groupId();
      names.putIfAbsent(key, r.groupName());
      long[] slot = byGroup.computeIfAbsent(key, k -> new long[2]);
      if (monthsAgo == 0) slot[0] += r.amountMinor();
      else slot[1] += r.amountMinor();
    }
    List<Mover> out = new ArrayList<>();
    for (var e : byGroup.entrySet()) {
      long thisMonth = e.getValue()[0];
      long usual = Math.round(e.getValue()[1] / 3.0 * fraction);
      if (usual <= 0) continue;
      long delta = thisMonth - usual;
      int pct = (int) Math.round(delta * 100.0 / usual);
      if (Math.abs(pct) < 15 || Math.abs(delta) < 1) continue;
      out.add(
          new Mover(
              e.getKey().equals(none) ? null : e.getKey(),
              names.get(e.getKey()),
              thisMonth,
              usual,
              delta,
              pct));
    }
    out.sort(Comparator.comparingLong((Mover m) -> Math.abs(m.deltaMinor())).reversed());
    return out.stream().limit(6).toList();
  }

  private List<Weekday> weekdays(List<HistoryRepository.Row> rows, LocalDate today) {
    LocalDate from = today.minusDays(89);
    long[] sums = new long[7];
    int[] counts = new int[7];
    for (LocalDate d = from; !d.isAfter(today); d = d.plusDays(1))
      counts[d.getDayOfWeek().getValue() - 1]++;
    for (var r : rows) {
      if (r.date().isBefore(from) || r.date().isAfter(today)) continue;
      sums[r.date().getDayOfWeek().getValue() - 1] += r.amountMinor();
    }
    long total = 0;
    long[] avg = new long[7];
    for (int i = 0; i < 7; i++) {
      avg[i] = counts[i] == 0 ? 0 : sums[i] / counts[i];
      total += avg[i];
    }
    List<Weekday> out = new ArrayList<>();
    for (int i = 0; i < 7; i++) {
      out.add(
          new Weekday(
              DayOfWeek.of(i + 1).getDisplayName(TextStyle.FULL, Locale.ENGLISH),
              avg[i],
              total == 0 ? 0 : (int) Math.round(avg[i] * 100.0 / total)));
    }
    return out;
  }

  private List<WeekOfMonth> weeksOfMonth(List<HistoryRepository.Row> rows, YearMonth now) {
    long[] sums = new long[5];
    Set<YearMonth> months = new HashSet<>();
    for (var r : rows) {
      YearMonth m = YearMonth.from(r.date());
      long ago = ChronoUnit.MONTHS.between(m, now);
      if (ago < 1 || ago > 6) continue; // completed months only
      months.add(m);
      sums[Math.min(4, (r.date().getDayOfMonth() - 1) / 7)] += r.amountMinor();
    }
    String[] labels = {"Days 1–7", "Days 8–14", "Days 15–21", "Days 22–28", "Days 29–31"};
    int n = Math.max(1, months.size());
    List<WeekOfMonth> out = new ArrayList<>();
    for (int i = 0; i < 5; i++) out.add(new WeekOfMonth(labels[i], sums[i] / n));
    return out;
  }

  /** Purchases far above the usual size for their category (median + robust spread). */
  private List<Anomaly> anomalies(List<HistoryRepository.Row> rows, LocalDate today) {
    Map<UUID, List<HistoryRepository.Row>> byGroup = new LinkedHashMap<>();
    UUID none = new UUID(0, 0);
    for (var r : rows)
      byGroup
          .computeIfAbsent(r.groupId() == null ? none : r.groupId(), k -> new ArrayList<>())
          .add(r);
    List<Anomaly> out = new ArrayList<>();
    for (var group : byGroup.values()) {
      if (group.size() < 8) continue;
      double[] amounts = group.stream().mapToDouble(r -> r.amountMinor()).toArray();
      double med = Forecaster.median(amounts);
      double[] dev = new double[amounts.length];
      for (int i = 0; i < amounts.length; i++) dev[i] = Math.abs(amounts[i] - med);
      double mad = Forecaster.median(dev) * 1.4826;
      double threshold = Math.max(med * 3, med + 6 * mad);
      for (var r : group) {
        if (r.date().isBefore(today.minusDays(60))) continue;
        if (r.amountMinor() > threshold && med > 0) {
          out.add(
              new Anomaly(
                  r.id(),
                  r.date(),
                  label(r),
                  r.groupName(),
                  r.amountMinor(),
                  Math.round(med),
                  (int) Math.round(r.amountMinor() / med)));
        }
      }
    }
    out.sort(Comparator.comparingInt(Anomaly::timesTypical).reversed());
    return out.stream().limit(8).toList();
  }

  /** Payees charged at a regular interval for a steady amount that aren't in Recurring yet. */
  private List<Subscription> subscriptions(
      UUID ws, List<HistoryRepository.Row> rows, LocalDate today) {
    Set<UUID> tracked = new HashSet<>();
    rules
        .findAll(ws)
        .forEach(
            r -> {
              if (r.payeeId() != null) tracked.add(r.payeeId());
            });
    Map<UUID, List<HistoryRepository.Row>> byPayee = new LinkedHashMap<>();
    for (var r : rows) {
      if (r.payeeId() == null || r.recurringRuleId() != null || tracked.contains(r.payeeId()))
        continue;
      byPayee.computeIfAbsent(r.payeeId(), k -> new ArrayList<>()).add(r);
    }
    List<Subscription> out = new ArrayList<>();
    for (var list : byPayee.values()) {
      if (list.size() < 3) continue;
      List<HistoryRepository.Row> sorted = new ArrayList<>(list);
      sorted.sort(Comparator.comparing(HistoryRepository.Row::date));
      double[] gaps = new double[sorted.size() - 1];
      for (int i = 1; i < sorted.size(); i++)
        gaps[i - 1] = ChronoUnit.DAYS.between(sorted.get(i - 1).date(), sorted.get(i).date());
      double gap = Forecaster.median(gaps);
      String freq;
      int perYear;
      if (gap >= 6 && gap <= 8) {
        freq = "WEEKLY";
        perYear = 52;
      } else if (gap >= 27 && gap <= 34) {
        freq = "MONTHLY";
        perYear = 12;
      } else if (gap >= 85 && gap <= 95) {
        freq = "QUARTERLY";
        perYear = 4;
      } else if (gap >= 358 && gap <= 372) {
        freq = "YEARLY";
        perYear = 1;
      } else continue;
      double[] amounts = sorted.stream().mapToDouble(r -> r.amountMinor()).toArray();
      double mean = Forecaster.mean(amounts);
      double var = 0;
      for (double a : amounts) var += (a - mean) * (a - mean);
      double cv = mean == 0 ? 1 : Math.sqrt(var / amounts.length) / mean;
      if (cv > 0.15) continue;
      var last = sorted.get(sorted.size() - 1);
      if (last.date().isBefore(today.minusDays((long) (gap * 2.5)))) continue; // stopped charging
      out.add(
          new Subscription(
              last.payeeName(),
              Math.round(Forecaster.median(amounts)),
              freq,
              last.date(),
              last.date().plusDays(Math.round(gap)),
              Math.round(Forecaster.median(amounts)) * perYear,
              sorted.size()));
    }
    out.sort(Comparator.comparingLong(Subscription::perYearMinor).reversed());
    return out.stream().limit(10).toList();
  }

  private List<SavingsMonth> savings(UUID ws, YearMonth now) {
    var flow = analytics.cashFlow(ws, now.minusMonths(11).atDay(1), now.atEndOfMonth());
    List<SavingsMonth> out = new ArrayList<>();
    for (var m : flow.items()) {
      if (m.incomeMinor() == 0 && m.expenseMinor() == 0) continue;
      int rate =
          m.incomeMinor() > 0
              ? (int) Math.round((m.incomeMinor() - m.expenseMinor()) * 100.0 / m.incomeMinor())
              : 0;
      out.add(new SavingsMonth(m.month(), rate, m.incomeMinor(), m.expenseMinor()));
    }
    return out;
  }

  /** Categories whose monthly spend has been climbing over the last six months. */
  private List<Growth> growth(List<HistoryRepository.Row> rows, YearMonth now) {
    Map<UUID, TreeMap<YearMonth, Long>> byGroup = new LinkedHashMap<>();
    Map<UUID, String> names = new LinkedHashMap<>();
    UUID none = new UUID(0, 0);
    for (var r : rows) {
      YearMonth m = YearMonth.from(r.date());
      long ago = ChronoUnit.MONTHS.between(m, now);
      if (ago < 1 || ago > 6) continue;
      UUID key = r.groupId() == null ? none : r.groupId();
      names.putIfAbsent(key, r.groupName());
      byGroup.computeIfAbsent(key, k -> new TreeMap<>()).merge(m, r.amountMinor(), Long::sum);
    }
    List<Growth> out = new ArrayList<>();
    for (var e : byGroup.entrySet()) {
      double[] y = new double[6];
      for (int i = 0; i < 6; i++) y[i] = e.getValue().getOrDefault(now.minusMonths(6 - i), 0L);
      long nonZero = java.util.Arrays.stream(y).filter(v -> v > 0).count();
      double mean = Forecaster.mean(y);
      if (nonZero < 4 || mean <= 0) continue;
      double xMean = 2.5;
      double num = 0;
      double den = 0;
      for (int i = 0; i < 6; i++) {
        num += (i - xMean) * (y[i] - mean);
        den += (i - xMean) * (i - xMean);
      }
      int pct = (int) Math.round(num / den / mean * 100);
      if (pct >= 5)
        out.add(
            new Growth(
                e.getKey().equals(none) ? null : e.getKey(),
                names.get(e.getKey()),
                pct,
                Math.round(y[5])));
    }
    out.sort(Comparator.comparingInt(Growth::percentPerMonth).reversed());
    return out.stream().limit(4).toList();
  }

  private static String label(HistoryRepository.Row r) {
    if (r.payeeName() != null) return r.payeeName();
    if (r.note() != null && !r.note().isBlank()) return r.note();
    return r.groupName();
  }

  private static String money(long minor, String currency) {
    try {
      Currency c = Currency.getInstance(currency);
      NumberFormat f = NumberFormat.getCurrencyInstance(Locale.US);
      f.setCurrency(c);
      f.setMaximumFractionDigits(0);
      f.setMinimumFractionDigits(0);
      return f.format(minor / Math.pow(10, c.getDefaultFractionDigits()));
    } catch (IllegalArgumentException e) {
      return minor / 100 + " " + currency;
    }
  }
}

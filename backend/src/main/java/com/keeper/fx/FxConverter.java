package com.keeper.fx;

import com.keeper.common.db.Db;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

/**
 * The only place the app converts between currencies. Any pair is derived from rates stored against
 * a USD pivot. Rates are kept in memory, reloaded hourly, and refreshed from the provider on demand
 * when the stored ones are older than today (so a sleeping host still gets fresh rates).
 */
@Singleton
public class FxConverter {
  private static final Duration RELOAD_EVERY = Duration.ofHours(1);

  private record Snapshot(Map<String, BigDecimal> perUsd, Instant loadedAt) {}

  private final FxRateRepository repository;
  private final FxRateService refresher;
  private final Db db;
  private volatile Snapshot snapshot = new Snapshot(Map.of(), Instant.EPOCH);
  private volatile Instant lastRefreshAttempt = Instant.EPOCH;

  public FxConverter(FxRateRepository repository, FxRateService refresher, Db db) {
    this.repository = repository;
    this.refresher = refresher;
    this.db = db;
  }

  private final java.util.concurrent.ConcurrentHashMap<LocalDate, Map<String, BigDecimal>> byDate =
      new java.util.concurrent.ConcurrentHashMap<>();

  /** The rate that applied on {@code date} (today and future dates use the current rate). */
  public Optional<BigDecimal> rateOn(String from, String to, LocalDate date) {
    if (from.equals(to)) return Optional.of(BigDecimal.ONE);
    if (!date.isBefore(LocalDate.now())) return rate(from, to);
    Map<String, BigDecimal> perUsd = ratesOn(date);
    BigDecimal fromRate = perUsd.get(from);
    BigDecimal toRate = perUsd.get(to);
    if (fromRate == null || toRate == null) return rate(from, to);
    return Optional.of(toRate.divide(fromRate, 12, RoundingMode.HALF_UP));
  }

  private Map<String, BigDecimal> ratesOn(LocalDate date) {
    Map<String, BigDecimal> cached = byDate.get(date);
    if (cached != null) return cached;
    Map<String, BigDecimal> stored = repository.on(date);
    if (stored.isEmpty()) stored = refresher.fetchHistorical(date);
    if (stored.isEmpty()) stored = repository.nearest(date);
    if (!stored.isEmpty()) byDate.put(date, stored);
    return stored;
  }

  /** Units of {@code to} per 1 {@code from}, or empty when either currency has no rate. */
  public Optional<BigDecimal> rate(String from, String to) {
    if (from.equals(to)) return Optional.of(BigDecimal.ONE);
    Map<String, BigDecimal> perUsd = rates();
    BigDecimal fromRate = perUsd.get(from);
    BigDecimal toRate = perUsd.get(to);
    if (fromRate == null || toRate == null) return Optional.empty();
    return Optional.of(toRate.divide(fromRate, 12, RoundingMode.HALF_UP));
  }

  public OptionalLong convert(long minor, String from, String to) {
    return rate(from, to)
        .map(r -> OptionalLong.of(CurrencyUnits.convert(minor, from, to, r)))
        .orElse(OptionalLong.empty());
  }

  /** Converter bound to a workspace's base currency; collects currencies it could not convert. */
  public Converter forWorkspace(UUID workspaceId) {
    String base =
        db.one(
                "SELECT base_currency FROM workspaces WHERE id = ?",
                rs -> rs.getString(1),
                workspaceId)
            .orElse("USD");
    return new Converter(base);
  }

  private Map<String, BigDecimal> rates() {
    Snapshot current = snapshot;
    if (Instant.now().isBefore(current.loadedAt.plus(RELOAD_EVERY)) && !current.perUsd.isEmpty()) {
      return current.perUsd;
    }
    synchronized (this) {
      current = snapshot;
      if (Instant.now().isBefore(current.loadedAt.plus(RELOAD_EVERY))
          && !current.perUsd.isEmpty()) {
        return current.perUsd;
      }
      refreshIfStale();
      snapshot = new Snapshot(repository.latest(), Instant.now());
      return snapshot.perUsd;
    }
  }

  private void refreshIfStale() {
    boolean stale = repository.newestDate().map(d -> d.isBefore(LocalDate.now())).orElse(true);
    boolean mayAttempt = Instant.now().isAfter(lastRefreshAttempt.plus(RELOAD_EVERY));
    if (stale && mayAttempt && refresher.isEnabled()) {
      lastRefreshAttempt = Instant.now();
      refresher.refresh();
    }
  }

  /** Drops the in-memory snapshot (used after rates are written outside the normal refresh). */
  public void invalidate() {
    snapshot = new Snapshot(Map.of(), Instant.EPOCH);
    byDate.clear();
  }

  public class Converter {
    private final String base;
    private final Set<String> missing = new TreeSet<>();

    Converter(String base) {
      this.base = base;
    }

    public String base() {
      return base;
    }

    /**
     * Amount in the base currency. Without a rate the amount is returned as-is and flagged in
     * {@link #missing()}.
     */
    public long toBase(long minor, String currency) {
      OptionalLong converted = convert(minor, currency, base);
      if (converted.isEmpty()) {
        missing.add(currency);
        return minor;
      }
      return converted.getAsLong();
    }

    public Set<String> missing() {
      return missing;
    }
  }
}

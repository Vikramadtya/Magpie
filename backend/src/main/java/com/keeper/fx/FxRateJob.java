package com.keeper.fx;

import com.keeper.common.db.Db;
import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Refreshes rates for every base currency in use, once a day. */
@Singleton
public class FxRateJob {
  private static final Logger LOG = LoggerFactory.getLogger(FxRateJob.class);

  private final FxRateProvider provider;
  private final Db db;

  public FxRateJob(FxRateProvider provider, Db db) {
    this.provider = provider;
    this.db = db;
  }

  @Scheduled(cron = "0 30 6 * * *", initialDelay = "1m")
  public void refresh() {
    List<String> bases =
        db.list("SELECT DISTINCT base_currency FROM workspaces", rs -> rs.getString(1));
    for (String base : bases) {
      try {
        provider
            .latest(base)
            .forEach(
                (quote, rate) ->
                    db.update(
                        "INSERT INTO exchange_rates(base, quote, rate, as_of) VALUES (?,?,?,?) "
                            + "ON CONFLICT (base, quote, as_of) DO UPDATE SET rate = EXCLUDED.rate",
                        base,
                        quote,
                        rate,
                        LocalDate.now()));
      } catch (RuntimeException e) {
        LOG.warn("FX refresh failed for {}: {}", base, e.getMessage());
      }
    }
  }
}

package com.keeper.fx;

import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;

/**
 * Daily refresh; on-demand refresh in {@link FxConverter} covers hosts that sleep through the cron.
 */
@Singleton
public class FxRateJob {
  private final FxRateService service;
  private final FxConverter converter;

  public FxRateJob(FxRateService service, FxConverter converter) {
    this.service = service;
    this.converter = converter;
  }

  @Scheduled(cron = "0 30 6 * * *", initialDelay = "10s")
  public void refresh() {
    if (service.refresh()) converter.invalidate();
  }
}

package com.keeper.recurring;

import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
public class RecurringJob {
  private static final Logger LOG = LoggerFactory.getLogger(RecurringJob.class);

  private final RecurringService service;

  public RecurringJob(RecurringService service) {
    this.service = service;
  }

  @Scheduled(cron = "0 5 0 * * *", initialDelay = "30s")
  public void run() {
    try {
      int n = service.postDue(LocalDate.now());
      if (n > 0) LOG.info("Posted {} recurring transactions", n);
    } catch (RuntimeException e) {
      LOG.error("Recurring job failed", e);
    }
  }
}

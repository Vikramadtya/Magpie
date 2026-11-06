package com.keeper.digest;

import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;
import java.time.Instant;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Hourly check, so a digest still goes out when the server was asleep at the usual time. */
@Singleton
public class DigestJob {
  private static final Logger LOG = LoggerFactory.getLogger(DigestJob.class);
  private final DigestService service;

  public DigestJob(DigestService service) {
    this.service = service;
  }

  @Scheduled(fixedDelay = "1h", initialDelay = "2m")
  public void run() {
    try {
      for (UUID ws : service.due(Instant.now())) {
        try {
          service.send(ws);
        } catch (RuntimeException e) {
          LOG.warn("Weekly digest failed for one workspace: {}", e.getMessage());
        }
      }
    } catch (RuntimeException e) {
      LOG.warn("Weekly digest check failed: {}", e.getMessage());
    }
  }
}

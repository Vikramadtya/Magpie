package com.keeper.fx;

import io.micronaut.context.annotation.Value;
import jakarta.inject.Singleton;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Fetches rates from the provider and stores them. Failures are logged, never thrown. */
@Singleton
public class FxRateService {
  private static final Logger LOG = LoggerFactory.getLogger(FxRateService.class);

  private final FxRateProvider provider;
  private final FxRateRepository repository;
  private final boolean enabled;

  public FxRateService(
      FxRateProvider provider,
      FxRateRepository repository,
      @Value("${keeper.fx.auto-refresh:true}") boolean enabled) {
    this.provider = provider;
    this.repository = repository;
    this.enabled = enabled;
  }

  public boolean isEnabled() {
    return enabled;
  }

  /** Returns true if fresh rates were stored. */
  public boolean refresh() {
    if (!enabled) return false;
    try {
      Map<String, BigDecimal> rates = provider.latest(FxRateRepository.PIVOT);
      if (rates.isEmpty()) return false;
      repository.save(rates, LocalDate.now());
      return true;
    } catch (RuntimeException e) {
      LOG.warn("FX refresh failed: {}", e.getMessage());
      return false;
    }
  }
}

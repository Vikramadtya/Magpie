package com.keeper.transaction;

import com.keeper.fx.FxRateService;
import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Fills in base-currency amounts for rows that lack one, and recomputes after a base-currency
 * change.
 */
@Singleton
public class NormalisationService {
  private static final Logger LOG = LoggerFactory.getLogger(NormalisationService.class);
  private static final int BATCH = 500;

  private final TransactionRepository transactions;
  private final Normaliser normaliser;
  private final FxRateService fxRates;

  public NormalisationService(
      TransactionRepository transactions, Normaliser normaliser, FxRateService fxRates) {
    this.transactions = transactions;
    this.normaliser = normaliser;
    this.fxRates = fxRates;
  }

  /** Picks up old rows (and any that had no rate when they were entered). */
  @Scheduled(fixedDelay = "30m", initialDelay = "30s")
  public void backfill() {
    if (!fxRates.isEnabled()) return;
    try {
      Map<UUID, String> bases = new HashMap<>();
      for (int round = 0; round < 20; round++) {
        List<TransactionRepository.Pending> batch = transactions.pendingNormalisation(BATCH);
        if (batch.isEmpty()) return;
        int filled = 0;
        for (var p : batch) {
          String base = bases.computeIfAbsent(p.workspaceId(), normaliser::baseCurrency);
          Normalised n = normaliser.compute(base, p.currency(), p.amountMinor(), p.date());
          if (n.amountMinor() != null) {
            transactions.writeNormalised(p.id(), n);
            filled++;
          }
        }
        if (filled == 0) return; // nothing resolvable right now (no rates); try again later
      }
    } catch (RuntimeException e) {
      LOG.warn("Normalisation backfill failed: {}", e.getMessage());
    }
  }

  /** The workspace's base currency changed: restate every non-overridden transaction. */
  public int recompute(UUID ws) {
    String base = normaliser.baseCurrency(ws);
    int n = 0;
    for (var p : transactions.recomputable(ws)) {
      Normalised v = normaliser.compute(base, p.currency(), p.amountMinor(), p.date());
      transactions.writeNormalised(p.id(), v);
      n++;
    }
    return n;
  }
}

package com.keeper.household;

import com.keeper.transaction.TransactionChanged;
import io.micronaut.runtime.event.annotation.EventListener;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Keeps household copies in step with the personal transactions they came from. */
@Singleton
public class HouseholdSyncListener {
  private static final Logger LOG = LoggerFactory.getLogger(HouseholdSyncListener.class);

  private final HouseholdService household;

  public HouseholdSyncListener(HouseholdService household) {
    this.household = household;
  }

  @EventListener
  public void on(TransactionChanged e) {
    try {
      household.resync(e.workspaceId(), e.transactionId());
    } catch (RuntimeException ex) {
      // never fail the user's own edit because the shared copy could not follow
      LOG.warn("Household sync failed for {}: {}", e.transactionId(), ex.getMessage());
    }
  }
}

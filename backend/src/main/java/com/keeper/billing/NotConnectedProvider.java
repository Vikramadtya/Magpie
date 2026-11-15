package com.keeper.billing;

import com.keeper.common.exception.BusinessRuleException;
import io.micronaut.context.annotation.Secondary;
import jakarta.inject.Singleton;
import java.util.UUID;

/**
 * Stands in until a payment provider is added; everything else (codes, limits, prices) already
 * works.
 */
@Singleton
@Secondary
public class NotConnectedProvider implements CheckoutProvider {
  @Override
  public boolean connected() {
    return false;
  }

  @Override
  public Session start(UUID userId, String interval, long firstPaymentMinor, String discountCode) {
    throw new BusinessRuleException(
        "Online payment is not open yet. If you have an access code, you can redeem it now.");
  }
}

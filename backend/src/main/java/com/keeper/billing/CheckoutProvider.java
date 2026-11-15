package com.keeper.billing;

import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

/**
 * A payment provider (Razorpay, Stripe...) behind one door. The provider hosts the payment page and
 * tells the server, by a signed webhook, when someone has paid; the server never trusts the
 * browser.
 */
public interface CheckoutProvider {
  @Serdeable
  record Session(String url) {}

  /**
   * Whether a provider is configured; until then the Billing page says payments are not open yet.
   */
  boolean connected();

  /** Starts a hosted checkout for the user and returns where to send them. */
  Session start(UUID userId, String interval, long firstPaymentMinor, String discountCode);
}

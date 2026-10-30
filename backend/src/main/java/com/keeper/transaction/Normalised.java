package com.keeper.transaction;

import java.math.BigDecimal;

/** A transaction's amount expressed in the workspace base currency. */
public record Normalised(Long amountMinor, String currency, BigDecimal rate, boolean overridden) {
  public static final Normalised NONE = new Normalised(null, null, null, false);
}

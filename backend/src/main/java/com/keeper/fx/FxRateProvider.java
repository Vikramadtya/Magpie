package com.keeper.fx;

import java.math.BigDecimal;
import java.util.Map;

/** Strategy for where exchange rates come from. */
public interface FxRateProvider {
  /** Units of each quote currency per 1 unit of {@code base}. */
  Map<String, BigDecimal> latest(String base);
}

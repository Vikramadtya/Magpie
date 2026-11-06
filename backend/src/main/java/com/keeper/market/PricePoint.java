package com.keeper.market;

import java.math.BigDecimal;
import java.time.LocalDate;

/** The price of something on one day, in the currency the market quotes it in. */
public record PricePoint(LocalDate date, BigDecimal price, String currency) {}

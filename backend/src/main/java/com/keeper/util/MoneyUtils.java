package com.keeper.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Utility for handling financial amounts with Banker's Rounding (HALF_EVEN).
 * All currency in the DB is stored as minor units (e.g., cents) using BIGINT.
 */
public class MoneyUtils {

    /**
     * Converts a major unit BigDecimal (e.g., 10.50 USD) to minor units (1050)
     * using Banker's Rounding (HALF_EVEN).
     *
     * @param amount     The amount in major units
     * @param minorUnits The number of decimal places for the currency (e.g., 2 for USD)
     * @return The amount in minor units
     */
    public static long toMinorUnits(BigDecimal amount, int minorUnits) {
        if (amount == null) return 0L;
        
        BigDecimal multiplier = BigDecimal.TEN.pow(minorUnits);
        return amount.multiply(multiplier)
                .setScale(0, RoundingMode.HALF_EVEN)
                .longValue();
    }

    /**
     * Converts minor units (e.g., 1050) to a major unit BigDecimal (10.50 USD).
     *
     * @param minorAmount The amount in minor units
     * @param minorUnits  The number of decimal places for the currency
     * @return The amount in major units
     */
    public static BigDecimal toMajorUnits(long minorAmount, int minorUnits) {
        BigDecimal divisor = BigDecimal.TEN.pow(minorUnits);
        return BigDecimal.valueOf(minorAmount).divide(divisor, minorUnits, RoundingMode.HALF_EVEN);
    }
}

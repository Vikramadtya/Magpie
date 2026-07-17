package com.keeper.service;

import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.Optional;

@Singleton
public class CurrencyService {

    private static final Logger LOG = LoggerFactory.getLogger(CurrencyService.class);
    private final DataSource dataSource;

    public CurrencyService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Convert an amount from one currency to another using the exchange rate on a specific date.
     * Fallback to the latest available rate if the rate for the specific date is not found.
     * 
     * @param amountMinor The amount in minor units (e.g., cents)
     * @param fromCurrency The currency code to convert from (e.g., "USD")
     * @param toCurrency The currency code to convert to (e.g., "EUR")
     * @param date The date for the exchange rate
     * @return The converted amount in minor units of the target currency
     */
    public Long convert(Long amountMinor, String fromCurrency, String toCurrency, LocalDate date) {
        if (fromCurrency == null || toCurrency == null || fromCurrency.equalsIgnoreCase(toCurrency)) {
            return amountMinor;
        }

        Double fromRateToUSD = getRateToUSD(fromCurrency, date);
        Double toRateToUSD = getRateToUSD(toCurrency, date);

        if (fromRateToUSD == null || toRateToUSD == null) {
            LOG.warn("Could not find exchange rate for {} or {} on {}. Returning original amount.", fromCurrency, toCurrency, date);
            return amountMinor; // Fallback or throw exception
        }

        // Calculation: 
        // Amount in USD = amountMinor / fromRateToUSD
        // Amount in Target = (Amount in USD) * toRateToUSD
        // Therefore: Target = amountMinor * (toRateToUSD / fromRateToUSD)
        
        double convertedAmount = amountMinor * (toRateToUSD / fromRateToUSD);
        return Math.round(convertedAmount);
    }

    /**
     * Gets the rate from the given currency to USD (base currency).
     * The table stores rates as USD -> Quote Currency.
     * So if looking up EUR, the table has base='USD', quote='EUR', rate=0.92
     * This means 1 USD = 0.92 EUR.
     * So the rate to convert USD to EUR is the stored rate.
     */
    private Double getRateToUSD(String currencyCode, LocalDate date) {
        if ("USD".equalsIgnoreCase(currencyCode)) {
            return 1.0;
        }

        try (Connection conn = dataSource.getConnection()) {
            // Try specific date first
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT rate FROM exchange_rates WHERE base_currency = 'USD' AND quote_currency = ? AND date <= ? ORDER BY date DESC LIMIT 1")) {
                ps.setString(1, currencyCode.toUpperCase());
                ps.setObject(2, date);
                
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        return rs.getDouble("rate");
                    }
                }
            }
            
            // If no rate found before the date, just get the oldest available rate
            try (PreparedStatement ps = conn.prepareStatement(
                    "SELECT rate FROM exchange_rates WHERE base_currency = 'USD' AND quote_currency = ? ORDER BY date ASC LIMIT 1")) {
                ps.setString(1, currencyCode.toUpperCase());
                
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        return rs.getDouble("rate");
                    }
                }
            }
        } catch (Exception e) {
            LOG.error("Failed to query exchange rate for currency {}", currencyCode, e);
        }
        
        return null;
    }
}

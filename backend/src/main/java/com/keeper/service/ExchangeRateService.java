package com.keeper.service;

import io.micronaut.context.event.ApplicationEventListener;
import io.micronaut.context.event.StartupEvent;
import io.micronaut.scheduling.annotation.Scheduled;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.sql.DataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.Map;
import io.micronaut.serde.ObjectMapper;

@Singleton
public class ExchangeRateService implements ApplicationEventListener<StartupEvent> {

    private static final Logger LOG = LoggerFactory.getLogger(ExchangeRateService.class);
    private final DataSource dataSource;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public ExchangeRateService(DataSource dataSource, ObjectMapper objectMapper) {
        this.dataSource = dataSource;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    @Override
    @Transactional
    public void onApplicationEvent(StartupEvent event) {
        try (Connection conn = dataSource.getConnection()) {
            // Fetch rates on startup if none exist for today
            try (PreparedStatement ps = conn.prepareStatement("SELECT COUNT(*) FROM exchange_rates WHERE date = CURRENT_DATE")) {
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next() && rs.getInt(1) == 0) {
                        LOG.info("No exchange rates found for today. Fetching immediately...");
                        fetchDailyExchangeRates();
                    }
                }
            }
        } catch (Exception e) {
            LOG.error("Failed to check exchange rates on startup", e);
        }
    }

    // Runs every day at midnight to fetch latest rates
    @Scheduled(cron = "0 0 * * *")
    @Transactional
    public void fetchDailyExchangeRates() {
        LOG.info("Fetching daily exchange rates from er-api...");
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://open.er-api.com/v6/latest/USD"))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                Map<String, Object> data = objectMapper.readValue(response.body(), Map.class);
                String baseCode = (String) data.get("base_code");
                Map<String, Number> rates = (Map<String, Number>) data.get("rates");
                LocalDate today = LocalDate.now();

                try (Connection conn = dataSource.getConnection()) {
                    // 1. Get all supported currencies
                    java.util.Set<String> supportedCurrencies = new java.util.HashSet<>();
                    try (PreparedStatement ps = conn.prepareStatement("SELECT code FROM currencies")) {
                        try (ResultSet rs = ps.executeQuery()) {
                            while (rs.next()) {
                                supportedCurrencies.add(rs.getString("code"));
                            }
                        }
                    }

                    // 2. Insert rates only for supported currencies
                    String sql = "INSERT INTO exchange_rates (base_currency, quote_currency, rate, date, source) " +
                                 "VALUES (?, ?, ?, ?, ?) " +
                                 "ON CONFLICT (base_currency, quote_currency, date) " +
                                 "DO UPDATE SET rate = EXCLUDED.rate";
                    
                    int inserted = 0;
                    try (PreparedStatement ps = conn.prepareStatement(sql)) {
                        for (Map.Entry<String, Number> entry : rates.entrySet()) {
                            String quoteCurrency = entry.getKey();
                            if (supportedCurrencies.contains(quoteCurrency)) {
                                ps.setString(1, baseCode);
                                ps.setString(2, quoteCurrency);
                                ps.setDouble(3, entry.getValue().doubleValue());
                                ps.setObject(4, today);
                                ps.setString(5, "er-api");
                                ps.addBatch();
                                inserted++;
                            }
                        }
                        if (inserted > 0) {
                            ps.executeBatch();
                        }
                        LOG.info("Successfully persisted {} exchange rates for {}", inserted, today);
                    }
                }
            } else {
                LOG.error("Failed to fetch exchange rates: HTTP {}", response.statusCode());
            }
        } catch (Exception e) {
            LOG.error("Exception while fetching exchange rates", e);
        }
    }
}

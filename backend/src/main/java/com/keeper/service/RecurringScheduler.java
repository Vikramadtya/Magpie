package com.keeper.service;

import jakarta.inject.Singleton;
import io.micronaut.scheduling.annotation.Scheduled;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
public class RecurringScheduler {

    private static final Logger LOG = LoggerFactory.getLogger(RecurringScheduler.class);
    
    // Runs every day at midnight to process recurring transactions
    @Scheduled(cron = "0 0 0 * * ?")
    void processRecurringTransactions() {
        LOG.info("Starting scheduled processing of recurring rules...");
        
        // 1. Fetch all active recurring rules where next_occurrence <= today
        // 2. For each rule:
        //    a. Create a new transaction based on the rule parameters
        //    b. Update the next_occurrence date by adding frequency_interval of frequency_type
        //    c. Save both the new transaction and updated rule
        
        LOG.info("Completed scheduled processing of recurring rules.");
    }
}

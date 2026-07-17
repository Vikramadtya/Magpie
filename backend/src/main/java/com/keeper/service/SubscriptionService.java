package com.keeper.service;

import com.keeper.domain.Subscription;
import com.keeper.domain.enums.BillingCycle;
import com.keeper.domain.enums.SubscriptionStatus;
import com.keeper.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Singleton
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;

    @Transactional
    public Subscription createSubscription(UUID workspaceId, UUID accountId, UUID categoryId, UUID payeeId, 
                                           String name, Long amount, String currency, 
                                           BillingCycle billingCycle, LocalDate nextBillingDate) {
        Subscription sub = Subscription.builder()
            .workspaceId(workspaceId)
            .id(UUID.randomUUID())
            .accountId(accountId)
            .categoryId(categoryId)
            .payeeId(payeeId)
            .name(name)
            .amount(amount)
            .currency(currency)
            .billingCycle(billingCycle)
            .nextBillingDate(nextBillingDate)
            .status(SubscriptionStatus.ACTIVE)
            .createdAt(Instant.now())
            .build();
            
        return subscriptionRepository.save(sub);
    }
    
    @Transactional
    public void pauseSubscription(UUID workspaceId, UUID subscriptionId) {
        // Find and pause...
    }

    @Transactional
    public List<Subscription> getSubscriptions(UUID workspaceId) {
        return subscriptionRepository.findByWorkspaceId(workspaceId);
    }
}

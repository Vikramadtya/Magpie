package com.keeper.controller;

import com.keeper.domain.Subscription;
import com.keeper.service.SubscriptionService;
import com.keeper.dto.SubscriptionDTO;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;

import java.util.List;
import java.util.UUID;

@Controller("/api/v1/subscriptions")
public class SubscriptionController {
    
    private final SubscriptionService subscriptionService;

    @Inject
    public SubscriptionController(SubscriptionService subscriptionService) {
        this.subscriptionService = subscriptionService;
    }

    @Get("/{workspaceId}")
    public List<Subscription> list(@PathVariable UUID workspaceId) {
        return subscriptionService.getSubscriptions(workspaceId);
    }

    @Post("/{workspaceId}")
    public Subscription create(@PathVariable UUID workspaceId, @Body SubscriptionDTO dto) {
        return subscriptionService.createSubscription(
            workspaceId, 
            dto.accountId(), 
            dto.categoryId(), 
            dto.payeeId(), 
            dto.name(), 
            dto.amount(), 
            dto.currency(), 
            dto.billingCycle(), 
            dto.nextBillingDate()
        );
    }

    @Put("/{workspaceId}/{subscriptionId}")
    public Subscription update(@PathVariable UUID workspaceId, @PathVariable UUID subscriptionId, @Body SubscriptionDTO dto) {
        throw new UnsupportedOperationException("Update not supported yet");
    }

    @Delete("/{workspaceId}/{subscriptionId}")
    public void delete(@PathVariable UUID workspaceId, @PathVariable UUID subscriptionId) {
        throw new UnsupportedOperationException("Delete not supported yet");
    }
}

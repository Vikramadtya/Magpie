package com.keeper.subscription;

import com.keeper.dto.*;
import jakarta.inject.Singleton;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class SubscriptionServiceImpl implements SubscriptionService {
  // private final SubscriptionRepository subscriptionRepository;

  @Override
  public SubscriptionDTO createSubscription(UUID workspaceId, SubscriptionDTO subscriptionDTO) {
    // TODO: Implement actual business logic
    return new SubscriptionDTO(
        java.util.UUID.randomUUID(),
        "Mock Subscription",
        new java.math.BigDecimal("15.99"),
        java.time.LocalDate.now(),
        "MONTHLY",
        "ACTIVE",
        "https://mock.com");
  }

  @Override
  public void deleteSubscription(UUID workspaceId, UUID id) {
    // TODO: Implement actual business logic
  }

  @Override
  public java.util.List<SubscriptionDTO> getSubscriptions(UUID workspaceId) {
    // TODO: Implement actual business logic
    return java.util.List.of(
        new SubscriptionDTO(
            java.util.UUID.randomUUID(),
            "Mock Subscription",
            new java.math.BigDecimal("15.99"),
            java.time.LocalDate.now(),
            "MONTHLY",
            "ACTIVE",
            "https://mock.com"));
  }

  @Override
  public SubscriptionDTO updateSubscription(
      UUID workspaceId, UUID id, SubscriptionDTO subscriptionDTO) {
    // TODO: Implement actual business logic
    return new SubscriptionDTO(
        java.util.UUID.randomUUID(),
        "Mock Subscription",
        new java.math.BigDecimal("15.99"),
        java.time.LocalDate.now(),
        "MONTHLY",
        "ACTIVE",
        "https://mock.com");
  }
}

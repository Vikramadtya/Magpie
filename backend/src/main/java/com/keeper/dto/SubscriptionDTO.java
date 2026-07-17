package com.keeper.dto;

import com.keeper.domain.enums.BillingCycle;
import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDate;
import java.util.UUID;

@Serdeable
public record SubscriptionDTO(
    UUID accountId,
    UUID categoryId,
    UUID payeeId,
    String name,
    Long amount,
    String currency,
    BillingCycle billingCycle,
    LocalDate nextBillingDate
) {}

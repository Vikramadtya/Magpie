package com.keeper.recurring;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDate;
import java.util.UUID;

@Serdeable
public record RecurringRule(
    UUID id,
    String name,
    UUID accountId,
    UUID categoryId,
    UUID payeeId,
    String type,
    long amountMinor,
    String currency,
    Frequency frequency,
    int intervalN,
    int anchorDay,
    LocalDate nextRunOn,
    LocalDate endOn,
    boolean autoPost,
    String status) {}

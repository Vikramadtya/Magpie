package com.keeper.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDate;
import java.util.UUID;

@Serdeable
public record GoalDTO(
    String name,
    Long targetAmount,
    String targetCurrency,
    LocalDate dueDate,
    Integer priority
) {}

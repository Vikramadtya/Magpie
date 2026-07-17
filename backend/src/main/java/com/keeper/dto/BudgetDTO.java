package com.keeper.dto;

import com.keeper.domain.enums.BudgetPeriod;
import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

@Serdeable
public record BudgetDTO(
    UUID categoryId,
    String name,
    Long amountLimit,
    BudgetPeriod period
) {}

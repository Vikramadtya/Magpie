package com.keeper.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDate;
import java.util.UUID;

@Serdeable
public record TransferCreateDTO(
    UUID fromAccountId,
    UUID toAccountId,
    Long amount,
    String currency,
    LocalDate date,
    String notes
) {}

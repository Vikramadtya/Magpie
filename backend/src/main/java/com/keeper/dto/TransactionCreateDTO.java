package com.keeper.dto;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDate;
import java.util.UUID;

@Serdeable
public record TransactionCreateDTO(
    AccountRef account,
    WorkspaceRef workspace,
    Long amount,
    String type,
    LocalDate date,
    PayeeRef payee,
    CategoryRef category,
    String status,
    String currency,
    String notes,
    String name
) {
    @Serdeable
    public record AccountRef(UUID id) {}

    @Serdeable
    public record WorkspaceRef(UUID id) {}

    @Serdeable
    public record PayeeRef(UUID id, String name, String type) {}

    @Serdeable
    public record CategoryRef(UUID id, String name) {}
}

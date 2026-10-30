package com.keeper.transaction;

import io.micronaut.serde.annotation.Serdeable;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Serdeable
public record TransactionView(
    UUID id,
    UUID accountId,
    String accountName,
    String type,
    int direction,
    long amountMinor,
    String currency,
    LocalDate occurredOn,
    UUID categoryId,
    String categoryName,
    UUID payeeId,
    String payeeName,
    String note,
    List<UUID> tagIds,
    UUID transferId,
    int version,
    UUID createdBy,
    Instant createdAt) {}

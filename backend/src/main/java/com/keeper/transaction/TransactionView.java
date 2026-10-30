package com.keeper.transaction;

import io.micronaut.serde.annotation.Serdeable;
import java.math.BigDecimal;
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
    Instant createdAt,
    Long origAmountMinor,
    String origCurrency,
    UUID loanId,
    String loanPerson,
    /**
     * Amount in the workspace base currency at that day's rate (null when no rate was available).
     */
    Long baseAmountMinor,
    String baseCurrency,
    BigDecimal baseFxRate,
    boolean baseOverridden,
    UUID sharedGroupId,
    boolean sharedCopy) {}

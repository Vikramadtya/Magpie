package com.keeper.account;

import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

@Serdeable
public record Account(
    UUID id,
    String name,
    String type,
    String currency,
    long openingBalanceMinor,
    long balanceMinor,
    boolean archived,
    int sortOrder,
    int version) {}

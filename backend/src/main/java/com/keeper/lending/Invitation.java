package com.keeper.lending;

import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

/** A lent account waiting for the guest to accept it. */
@Serdeable
public record Invitation(UUID id, String ownerName, String accountName, String currency) {}

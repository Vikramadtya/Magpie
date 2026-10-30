package com.keeper.lending;

import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

/** An account an owner has lent, as the owner sees it. */
@Serdeable
public record Share(UUID id, UUID accountId, String guestEmail, String guestName, String status) {}

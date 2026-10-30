package com.keeper.person;

import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

/** Someone other than the ledger owner who spends from the owner's accounts. */
@Serdeable
public record Person(UUID id, String name) {}

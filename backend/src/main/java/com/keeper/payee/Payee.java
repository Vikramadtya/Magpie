package com.keeper.payee;

import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

@Serdeable
public record Payee(UUID id, String name, UUID defaultCategoryId) {}

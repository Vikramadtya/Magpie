package com.keeper.workspace;

import com.keeper.security.Role;
import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

@Serdeable
public record Workspace(UUID id, String name, String baseCurrency, Role role) {}

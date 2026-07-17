package com.keeper.dto;

import com.keeper.domain.enums.AccountClass;
import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

@Serdeable
public record AccountCreateDTO(
    String name,
    AccountClass type,
    String currency,
    String icon,
    UUID parentId,
    Long initialBalance
) {}

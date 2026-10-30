package com.keeper.category;

import io.micronaut.serde.annotation.Serdeable;
import java.util.UUID;

@Serdeable
public record Category(
    UUID id,
    UUID parentId,
    String name,
    String kind,
    String icon,
    String color,
    boolean archived) {}

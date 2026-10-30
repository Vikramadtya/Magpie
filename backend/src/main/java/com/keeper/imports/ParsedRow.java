package com.keeper.imports;

import io.micronaut.serde.annotation.Serdeable;
import java.time.LocalDate;

/** One normalized statement line; negative amount = money out. */
@Serdeable
public record ParsedRow(LocalDate date, long amountMinor, String description, boolean duplicate) {}

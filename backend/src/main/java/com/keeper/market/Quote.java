package com.keeper.market;

import io.micronaut.serde.annotation.Serdeable;
import java.math.BigDecimal;
import java.time.Instant;

@Serdeable
public record Quote(
    String symbol,
    String name,
    BigDecimal price,
    String currency,
    String exchange,
    Instant asOf,
    String source) {}

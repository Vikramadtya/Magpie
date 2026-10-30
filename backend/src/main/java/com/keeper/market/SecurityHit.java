package com.keeper.market;

import io.micronaut.serde.annotation.Serdeable;

/** One search result: enough to identify the exact instrument. */
@Serdeable
public record SecurityHit(
    String symbol, String name, String exchange, String type, String currency) {}

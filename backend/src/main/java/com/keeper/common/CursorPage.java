package com.keeper.common;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

/** Keyset page: pass {@code nextCursor} back to fetch the following page. */
@Serdeable
public record CursorPage<T>(List<T> items, String nextCursor) {}

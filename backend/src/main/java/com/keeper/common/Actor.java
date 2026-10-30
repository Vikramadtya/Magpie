package com.keeper.common;

import io.micronaut.security.authentication.Authentication;
import java.util.UUID;

/** The authenticated user's id (the JWT subject). */
public final class Actor {
  private Actor() {}

  public static UUID id(Authentication auth) {
    return UUID.fromString(auth.getName());
  }
}

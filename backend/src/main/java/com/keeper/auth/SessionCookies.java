package com.keeper.auth;

import io.micronaut.context.annotation.Value;
import io.micronaut.http.cookie.Cookie;
import io.micronaut.http.cookie.SameSite;
import jakarta.inject.Singleton;
import java.time.Duration;

/** Builds the HttpOnly refresh-token cookie; the access token never touches a cookie. */
@Singleton
public class SessionCookies {
  public static final String NAME = "keeper_rt";

  private final boolean secure;

  public SessionCookies(@Value("${keeper.cookie.secure:true}") boolean secure) {
    this.secure = secure;
  }

  public Cookie set(String refreshToken) {
    return build(refreshToken, TokenService.REFRESH_TTL);
  }

  public Cookie clear() {
    return build("", Duration.ZERO);
  }

  private Cookie build(String value, Duration maxAge) {
    return Cookie.of(NAME, value)
        .httpOnly(true)
        .secure(secure)
        .sameSite(SameSite.Lax)
        .path("/api/v1/auth")
        .maxAge(maxAge);
  }
}

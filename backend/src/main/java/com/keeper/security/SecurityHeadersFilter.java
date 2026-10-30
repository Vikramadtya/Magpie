package com.keeper.security;

import io.micronaut.http.MutableHttpResponse;
import io.micronaut.http.annotation.ResponseFilter;
import io.micronaut.http.annotation.ServerFilter;

@ServerFilter("/**")
public class SecurityHeadersFilter {

  @ResponseFilter
  public void addHeaders(MutableHttpResponse<?> response) {
    response.getHeaders().add("X-Content-Type-Options", "nosniff");
    response.getHeaders().add("Referrer-Policy", "no-referrer");
    response.getHeaders().add("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    response
        .getHeaders()
        .add("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  }
}

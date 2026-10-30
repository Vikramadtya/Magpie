package com.keeper.common;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import java.util.Map;

/** Anonymous liveness probes (Render health check, frontend wake-up poll). */
@Controller
@Secured(SecurityRule.IS_ANONYMOUS)
public class HealthController {

  @Get("/")
  public Map<String, String> index() {
    return Map.of("status", "UP", "service", "keeper-backend");
  }

  @Get("/health")
  public Map<String, String> health() {
    return Map.of("status", "UP");
  }
}

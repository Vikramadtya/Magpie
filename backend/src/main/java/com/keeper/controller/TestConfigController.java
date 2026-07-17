package com.keeper.controller;

import io.micronaut.context.annotation.Value;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import java.util.Map;
import java.util.Optional;

@Controller("/api/test-config")
@Secured(SecurityRule.IS_ANONYMOUS)
public class TestConfigController {

    @Value("${micronaut.security.oauth2.clients.google.client-id}")
    Optional<String> clientId;
    
    @Value("${micronaut.security.oauth2.clients.google.openid.issuer}")
    Optional<String> issuer;

    @Get
    public Map<String, String> getConfig() {
        return Map.of(
            "clientId", clientId.orElse("MISSING"),
            "issuer", issuer.orElse("MISSING")
        );
    }
}

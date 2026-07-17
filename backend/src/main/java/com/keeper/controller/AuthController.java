package com.keeper.controller;

import com.keeper.domain.User;
import com.keeper.service.AuthService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;

import java.util.Map;

@Controller("/api/auth")
@Secured(SecurityRule.IS_ANONYMOUS)
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Post("/register")
    public HttpResponse<?> register(@Body RegisterRequest request) {
        try {
            User user = authService.registerUser(request.email(), request.password(), request.name());
            return HttpResponse.ok(Map.of(
                "message", "User registered successfully",
                "userId", user.getId()
            ));
        } catch (IllegalArgumentException e) {
            return HttpResponse.badRequest(Map.of("error", e.getMessage()));
        }
    }

    @io.micronaut.serde.annotation.Serdeable
    public record RegisterRequest(String email, String password, String name) {}
}

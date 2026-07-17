package com.keeper.security;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.oauth2.endpoint.authorization.state.State;
import io.micronaut.security.oauth2.endpoint.token.response.OauthAuthenticationMapper;
import io.micronaut.security.oauth2.endpoint.token.response.TokenResponse;
import jakarta.inject.Named;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

@Named("google")
@Singleton
public class GoogleUserDetailsMapper implements OauthAuthenticationMapper {

    private static final Logger LOG = LoggerFactory.getLogger(GoogleUserDetailsMapper.class);

    @Override
    public Publisher<AuthenticationResponse> createAuthenticationResponse(TokenResponse tokenResponse, @Nullable State state) {
        LOG.info("Received Google OAuth token response.");
        LOG.debug("Token Response: Access Token = {}, Refresh Token = {}", tokenResponse.getAccessToken(), tokenResponse.getRefreshToken());
        
        // At this point, we just want to create a successful authentication based on the token.
        // We'll extract basic information if available, otherwise just use a default identifier for testing.
        String email = "google-user@example.com"; // We will extract this later from OpenID token if needed
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("accessToken", tokenResponse.getAccessToken());

        LOG.info("Creating Authentication Response for user: {}", email);
        return Mono.just(AuthenticationResponse.success(email, attributes));
    }
}

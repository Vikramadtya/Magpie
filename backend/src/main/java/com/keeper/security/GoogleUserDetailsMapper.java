package com.keeper.security;

import com.keeper.auth.AuthService;
import com.keeper.auth.User;
import io.micronaut.context.annotation.Replaces;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.oauth2.endpoint.authorization.state.State;
import io.micronaut.security.oauth2.endpoint.token.response.DefaultOpenIdAuthenticationMapper;
import io.micronaut.security.oauth2.endpoint.token.response.OpenIdAuthenticationMapper;
import io.micronaut.security.oauth2.endpoint.token.response.OpenIdClaims;
import io.micronaut.security.oauth2.endpoint.token.response.OpenIdTokenResponse;
import jakarta.inject.Singleton;
import java.util.List;
import java.util.Map;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

@Singleton
@Replaces(DefaultOpenIdAuthenticationMapper.class)
public class GoogleUserDetailsMapper implements OpenIdAuthenticationMapper {

  private final AuthService authService;

  public GoogleUserDetailsMapper(AuthService authService) {
    this.authService = authService;
  }

  @Override
  public Publisher<AuthenticationResponse> createAuthenticationResponse(
      String providerName, OpenIdTokenResponse tokenResponse, OpenIdClaims claims, State state) {
    // Only trust Google's email when it is verified, otherwise anyone could claim someone's
    // account.
    if (claims.getEmail() == null || !Boolean.TRUE.equals(claims.get("email_verified"))) {
      return Mono.just(AuthenticationResponse.failure("Email not verified"));
    }
    return Mono.fromCallable(
            () -> authService.findOrCreateOauthUser(claims.getEmail(), claims.getName()))
        .subscribeOn(reactor.core.scheduler.Schedulers.boundedElastic())
        .map(User::id)
        .map(
            id ->
                AuthenticationResponse.success(
                    id.toString(), List.of("ROLE_USER"), Map.of("email", claims.getEmail())));
  }
}

package com.keeper.security;

import io.micronaut.context.annotation.Requires;
import io.micronaut.context.annotation.Value;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.handlers.RedirectingLoginHandler;
import io.micronaut.security.token.generator.AccessRefreshTokenGenerator;
import io.micronaut.security.token.render.AccessRefreshToken;
import jakarta.inject.Singleton;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
@Requires(property = "micronaut.security.authentication", value = "bearer")
public class CustomOauthLoginHandler
    implements RedirectingLoginHandler<HttpRequest<?>, MutableHttpResponse<?>> {

  private static final Logger LOG = LoggerFactory.getLogger(CustomOauthLoginHandler.class);

  private final AccessRefreshTokenGenerator accessRefreshTokenGenerator;

  @Value("${micronaut.security.redirect.login-success}")
  private String loginSuccessUri;

  @Value("${micronaut.security.redirect.login-failure}")
  private String loginFailureUri;

  public CustomOauthLoginHandler(AccessRefreshTokenGenerator accessRefreshTokenGenerator) {
    this.accessRefreshTokenGenerator = accessRefreshTokenGenerator;
  }

  @Override
  public MutableHttpResponse<?> loginSuccess(
      Authentication authentication, HttpRequest<?> request) {
    LOG.info("Login successful for user: {}", authentication.getName());

    Optional<AccessRefreshToken> accessRefreshToken =
        accessRefreshTokenGenerator.generate(authentication);
    if (accessRefreshToken.isPresent()) {
      String token = accessRefreshToken.get().getAccessToken();
      LOG.debug("Generated Access Token for OAuth user: {}", token);
      try {
        // Redirect to frontend with the token in the URL fragment so the frontend can store it
        URI redirectUri = new URI(loginSuccessUri + "#access_token=" + token);
        return HttpResponse.seeOther(redirectUri);
      } catch (URISyntaxException e) {
        LOG.error("Invalid redirect URI", e);
        return HttpResponse.serverError();
      }
    }
    return HttpResponse.serverError();
  }

  @Override
  public MutableHttpResponse<?> loginRefresh(
      Authentication authentication, String refreshToken, HttpRequest<?> request) {
    return HttpResponse.ok(); // Not typically used for OAuth redirect flow
  }

  @Override
  public MutableHttpResponse<?> loginFailed(
      AuthenticationResponse authenticationFailed, HttpRequest<?> request) {
    LOG.warn("Login failed: {}", authenticationFailed.getMessage().orElse("unknown"));
    try {
      return HttpResponse.seeOther(new URI(loginFailureUri));
    } catch (URISyntaxException e) {
      return HttpResponse.serverError();
    }
  }
}

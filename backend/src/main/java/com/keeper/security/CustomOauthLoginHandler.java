package com.keeper.security;

import com.keeper.auth.SessionCookies;
import com.keeper.auth.TokenService;
import com.keeper.auth.UserRepository;
import io.micronaut.context.annotation.Value;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.MutableHttpResponse;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.handlers.RedirectingLoginHandler;
import jakarta.inject.Singleton;
import java.net.URI;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * After Google sign-in, start a session by setting the refresh cookie and send the browser to the
 * SPA. No token is placed in the URL; the SPA exchanges the cookie for an access token.
 */
@Singleton
public class CustomOauthLoginHandler
    implements RedirectingLoginHandler<HttpRequest<?>, MutableHttpResponse<?>> {

  private static final Logger LOG = LoggerFactory.getLogger(CustomOauthLoginHandler.class);

  private final TokenService tokens;
  private final UserRepository users;
  private final SessionCookies cookies;
  private final URI success;
  private final URI failure;

  public CustomOauthLoginHandler(
      TokenService tokens,
      UserRepository users,
      SessionCookies cookies,
      @Value("${micronaut.security.redirect.login-success}") String success,
      @Value("${micronaut.security.redirect.login-failure}") String failure) {
    this.tokens = tokens;
    this.users = users;
    this.cookies = cookies;
    this.success = URI.create(success);
    this.failure = URI.create(failure);
  }

  @Override
  public MutableHttpResponse<?> loginSuccess(
      Authentication authentication, HttpRequest<?> request) {
    var user = users.findById(UUID.fromString(authentication.getName()));
    if (user.isEmpty()) {
      return HttpResponse.seeOther(failure);
    }
    TokenService.Pair pair = tokens.issue(user.get());
    return HttpResponse.seeOther(success).cookie(cookies.set(pair.refreshToken()));
  }

  @Override
  public MutableHttpResponse<?> loginRefresh(
      Authentication authentication, String refreshToken, HttpRequest<?> request) {
    return HttpResponse.ok();
  }

  @Override
  public MutableHttpResponse<?> loginFailed(
      AuthenticationResponse authenticationFailed, HttpRequest<?> request) {
    LOG.warn("Login failed: {}", authenticationFailed.getMessage().orElse("unknown"));
    return HttpResponse.seeOther(failure);
  }
}

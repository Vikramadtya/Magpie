package com.keeper.auth;

import com.keeper.common.Actor;
import com.keeper.common.exception.UnauthorizedException;
import com.keeper.workspace.Workspace;
import com.keeper.workspace.WorkspaceService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.CookieValue;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1")
@io.micronaut.validation.Validated
public class AuthController {

  @Serdeable
  public record RegisterRequest(
      @NotBlank @Email @Size(max = 255) String email,
      @NotBlank @Size(max = 72) String password,
      @NotBlank @Size(max = 120) String name,
      @Pattern(regexp = "^[A-Za-z]{3}$") String currency) {}

  @Serdeable
  public record LoginRequest(@NotBlank String email, @NotBlank String password) {}

  @Serdeable
  public record UserView(UUID id, String email, String name) {}

  @Serdeable
  public record SessionResponse(String accessToken, int expiresIn, UserView user) {}

  @Serdeable
  public record MeResponse(UserView user, List<Workspace> workspaces) {}

  private final AuthService auth;
  private final TokenService tokens;
  private final UserRepository users;
  private final WorkspaceService workspaces;
  private final SessionCookies cookies;

  public AuthController(
      AuthService auth,
      TokenService tokens,
      UserRepository users,
      WorkspaceService workspaces,
      SessionCookies cookies) {
    this.auth = auth;
    this.tokens = tokens;
    this.users = users;
    this.workspaces = workspaces;
    this.cookies = cookies;
  }

  @Post("/auth/register")
  @Secured(SecurityRule.IS_ANONYMOUS)
  public HttpResponse<SessionResponse> register(@Valid @Body RegisterRequest body) {
    User user = auth.register(body.email(), body.password(), body.name(), body.currency());
    return session(user);
  }

  @Post("/auth/login")
  @Secured(SecurityRule.IS_ANONYMOUS)
  public HttpResponse<SessionResponse> login(@Valid @Body LoginRequest body) {
    return session(auth.authenticate(body.email(), body.password()));
  }

  @Post(value = "/auth/refresh", consumes = io.micronaut.http.MediaType.ALL)
  @Secured(SecurityRule.IS_ANONYMOUS)
  public HttpResponse<SessionResponse> refresh(
      @CookieValue(value = SessionCookies.NAME, defaultValue = "") String token) {
    if (token.isEmpty()) {
      throw new UnauthorizedException("No session");
    }
    TokenService.Rotated rotated = tokens.rotate(token);
    return HttpResponse.ok(response(rotated.pair(), rotated.user()))
        .cookie(cookies.set(rotated.pair().refreshToken()));
  }

  @Post(value = "/auth/logout", consumes = io.micronaut.http.MediaType.ALL)
  @Secured(SecurityRule.IS_ANONYMOUS)
  public HttpResponse<Void> logout(
      @CookieValue(value = SessionCookies.NAME, defaultValue = "") String token) {
    if (!token.isEmpty()) {
      tokens.revoke(token);
    }
    return HttpResponse.<Void>noContent().cookie(cookies.clear());
  }

  @Get("/me")
  public MeResponse me(Authentication authentication) {
    UUID id = Actor.id(authentication);
    User user = users.findById(id).orElseThrow(() -> new UnauthorizedException("No session"));
    return new MeResponse(view(user), workspaces.list(id));
  }

  private HttpResponse<SessionResponse> session(User user) {
    TokenService.Pair pair = auth.startSession(user);
    return HttpResponse.ok(response(pair, user)).cookie(cookies.set(pair.refreshToken()));
  }

  private static SessionResponse response(TokenService.Pair pair, User user) {
    return new SessionResponse(pair.accessToken(), pair.expiresIn(), view(user));
  }

  private static UserView view(User user) {
    return new UserView(user.id(), user.email(), user.name());
  }
}

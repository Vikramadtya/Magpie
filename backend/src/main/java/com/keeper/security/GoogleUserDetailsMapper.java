package com.keeper.security;

import com.keeper.auth.AuthService;
import com.keeper.auth.User;
import com.keeper.workspace.Workspace;
import com.keeper.workspace.WorkspaceRepository;
import io.micronaut.context.annotation.Replaces;
import io.micronaut.security.authentication.AuthenticationResponse;
import io.micronaut.security.oauth2.endpoint.authorization.state.State;
import io.micronaut.security.oauth2.endpoint.token.response.DefaultOpenIdAuthenticationMapper;
import io.micronaut.security.oauth2.endpoint.token.response.OpenIdAuthenticationMapper;
import io.micronaut.security.oauth2.endpoint.token.response.OpenIdClaims;
import io.micronaut.security.oauth2.endpoint.token.response.OpenIdTokenResponse;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.reactivestreams.Publisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Singleton
@Replaces(DefaultOpenIdAuthenticationMapper.class)
public class GoogleUserDetailsMapper implements OpenIdAuthenticationMapper {

  private static final Logger LOG = LoggerFactory.getLogger(GoogleUserDetailsMapper.class);

  private final AuthService authService;
  private final WorkspaceRepository workspaceRepository;

  @Inject
  public GoogleUserDetailsMapper(AuthService authService, WorkspaceRepository workspaceRepository) {
    this.authService = authService;
    this.workspaceRepository = workspaceRepository;
  }

  @Override
  public Publisher<AuthenticationResponse> createAuthenticationResponse(
      String providerName,
      OpenIdTokenResponse tokenResponse,
      OpenIdClaims openIdClaims,
      State state) {
    LOG.info("Received Google OAuth token response for OpenID mapper.");

    String email = openIdClaims.getEmail();
    String name = openIdClaims.getName();

    // Get or create user
    User user = authService.getOrCreateOauthUser(email, name);

    // Find their workspace (defaulting to the first one they own)
    List<Workspace> workspaces = workspaceRepository.findByUserId(user.getId());
    String workspaceIdStr = workspaces.isEmpty() ? null : workspaces.get(0).getId().toString();

    Map<String, Object> attributes = new HashMap<>();
    attributes.put("email", email);
    attributes.put("name", name);
    if (workspaceIdStr != null) {
      attributes.put("workspaceId", workspaceIdStr);
    }

    LOG.info(
        "Creating Authentication Response for user: {} with workspace: {}", email, workspaceIdStr);
    return reactor.core.publisher.Mono.just(AuthenticationResponse.success(email, attributes));
  }
}

package com.keeper.security;

import com.keeper.common.Actor;
import io.micronaut.core.order.Ordered;
import io.micronaut.http.HttpMethod;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.RequestFilter;
import io.micronaut.http.annotation.ServerFilter;
import io.micronaut.http.filter.ServerFilterPhase;
import io.micronaut.security.authentication.Authentication;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Single choke point for tenant isolation: every /api/v1/workspaces/{id}/... request must come from
 * the ledger's member. Anyone else gets 404 so ids cannot be probed.
 */
@ServerFilter("/api/v1/workspaces/**")
public class WorkspaceAccessFilter implements Ordered {

  public static final String ROLE_ATTRIBUTE = "keeper.workspace.role";
  private static final Pattern PATH =
      Pattern.compile("^/api/v1/workspaces/([0-9a-fA-F-]{36})(/.*)?$");

  private final MembershipCache memberships;

  public WorkspaceAccessFilter(MembershipCache memberships) {
    this.memberships = memberships;
  }

  @RequestFilter
  @io.micronaut.core.annotation.Nullable
  public HttpResponse<?> check(HttpRequest<?> request) {
    Matcher m = PATH.matcher(request.getPath());
    if (!m.matches()) {
      return null; // the workspace list is handled by the controller
    }
    Authentication auth = request.getUserPrincipal(Authentication.class).orElse(null);
    if (auth == null) {
      return problem(HttpStatus.UNAUTHORIZED, "Sign in required");
    }
    UUID workspaceId;
    try {
      workspaceId = UUID.fromString(m.group(1));
    } catch (IllegalArgumentException e) {
      return problem(HttpStatus.NOT_FOUND, "Workspace not found");
    }
    Optional<Role> role = memberships.roleOf(Actor.id(auth), workspaceId);
    if (role.isEmpty()) {
      return problem(HttpStatus.NOT_FOUND, "Workspace not found");
    }
    String rest = m.group(2) == null ? "" : m.group(2);
    if (!role.get().atLeast(required(request.getMethod(), rest))) {
      return problem(HttpStatus.FORBIDDEN, "Your role does not allow this action");
    }
    request.setAttribute(ROLE_ATTRIBUTE, role.get());
    return null;
  }

  static Role required(HttpMethod method, String rest) {
    boolean read = method == HttpMethod.GET || method == HttpMethod.HEAD;
    if (rest.isEmpty() && !read) return Role.OWNER; // rename / delete the ledger
    return read ? Role.VIEWER : Role.EDITOR;
  }

  private static HttpResponse<?> problem(HttpStatus status, String detail) {
    return HttpResponse.status(status)
        .body(Map.of("status", status.getCode(), "title", status.getReason(), "detail", detail));
  }

  @Override
  public int getOrder() {
    return ServerFilterPhase.SECURITY.after();
  }
}

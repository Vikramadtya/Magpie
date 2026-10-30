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
 * a member whose role covers the HTTP method. Non-members get 404 so ids cannot be probed.
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
      return null; // collection routes (list/create workspaces) handled by the controller
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
    Optional<MembershipCache.Membership> membership =
        memberships.membership(Actor.id(auth), workspaceId);
    if (membership.isEmpty()) {
      return problem(HttpStatus.NOT_FOUND, "Workspace not found");
    }
    Role role = membership.get().role();
    boolean household = "SHARED".equals(membership.get().kind());
    String rest = m.group(2) == null ? "" : m.group(2);
    boolean read = request.getMethod() == HttpMethod.GET || request.getMethod() == HttpMethod.HEAD;
    if (household && !read && !householdWritable(rest)) {
      return problem(
          HttpStatus.FORBIDDEN,
          "A shared ledger is view-only. Record the expense in your own ledger and share it there.");
    }
    if (!role.atLeast(required(request.getMethod(), rest, household))) {
      return problem(HttpStatus.FORBIDDEN, "Your role does not allow this action");
    }
    request.setAttribute(ROLE_ATTRIBUTE, role);
    return null;
  }

  /**
   * What a household still accepts: membership management, settling up and comments on shared
   * expenses.
   */
  static boolean householdWritable(String rest) {
    return rest.isEmpty()
        || rest.equals("/leave")
        || rest.startsWith("/members")
        || rest.startsWith("/invites")
        || rest.startsWith("/household/settlements")
        || rest.matches("^/transactions/[0-9a-fA-F-]{36}/comments$");
  }

  static Role required(HttpMethod method, String rest, boolean household) {
    boolean read = method == HttpMethod.GET || method == HttpMethod.HEAD;
    if (rest.equals("/leave")) return Role.VIEWER;
    // every household member can settle up and comment, whatever their invite role
    if (household
        && !read
        && (rest.startsWith("/household/settlements") || rest.contains("/comments"))) {
      return Role.VIEWER;
    }
    boolean ownerOnly =
        rest.isEmpty() && !read // rename / delete workspace
            || (rest.startsWith("/members") || rest.startsWith("/invites")) && !read;
    if (ownerOnly) return Role.OWNER;
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

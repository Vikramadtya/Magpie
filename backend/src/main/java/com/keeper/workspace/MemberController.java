package com.keeper.workspace;

import com.keeper.common.Actor;
import com.keeper.security.Role;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Patch;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1")
@io.micronaut.validation.Validated
public class MemberController {

  @Serdeable
  public record RoleRequest(@NotNull Role role) {}

  @Serdeable
  public record InviteResponse(String token, String path) {}

  private final WorkspaceService service;

  public MemberController(WorkspaceService service) {
    this.service = service;
  }

  @Get("/workspaces/{workspaceId}/members")
  public List<WorkspaceRepository.Member> members(@PathVariable UUID workspaceId) {
    return service.members(workspaceId);
  }

  @Patch("/workspaces/{workspaceId}/members/{userId}")
  public void changeRole(
      @PathVariable UUID workspaceId,
      @PathVariable UUID userId,
      @jakarta.validation.Valid @Body RoleRequest body) {
    service.changeRole(workspaceId, userId, body.role());
  }

  @Delete("/workspaces/{workspaceId}/members/{userId}")
  public void remove(@PathVariable UUID workspaceId, @PathVariable UUID userId) {
    service.removeMember(workspaceId, userId);
  }

  /** Any member may leave; handled outside the owner-only /members rule. */
  @Post("/workspaces/{workspaceId}/leave")
  public void leave(Authentication auth, @PathVariable UUID workspaceId) {
    service.leave(workspaceId, Actor.id(auth));
  }

  @Post("/workspaces/{workspaceId}/invites")
  public InviteResponse invite(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @jakarta.validation.Valid @Body RoleRequest body) {
    String token = service.invite(workspaceId, Actor.id(auth), body.role());
    return new InviteResponse(token, "/invite/" + token);
  }

  @Post("/invites/{token}/accept")
  public Workspace accept(Authentication auth, @PathVariable String token) {
    return service.accept(token, Actor.id(auth));
  }
}

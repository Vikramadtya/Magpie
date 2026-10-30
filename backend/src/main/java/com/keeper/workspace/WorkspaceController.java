package com.keeper.workspace;

import com.keeper.common.Actor;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Patch;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces")
@io.micronaut.validation.Validated
public class WorkspaceController {

  @Serdeable
  public record WorkspaceRequest(
      @NotBlank @Size(max = 120) String name,
      @Pattern(regexp = "^[A-Za-z]{3}$") String currency,
      /** PERSONAL (default) or HOUSEHOLD (a ledger shared by the people who live together). */
      @Pattern(regexp = "^(PERSONAL|HOUSEHOLD)$") String kind) {}

  private final WorkspaceService service;

  public WorkspaceController(WorkspaceService service) {
    this.service = service;
  }

  @Get
  public List<Workspace> list(Authentication auth) {
    return service.list(Actor.id(auth));
  }

  @Post
  public Workspace create(Authentication auth, @Valid @Body WorkspaceRequest body) {
    return service.create(
        Actor.id(auth),
        body.name(),
        body.currency() == null ? "USD" : body.currency(),
        body.kind() == null ? "PERSONAL" : body.kind());
  }

  @Patch("/{workspaceId}")
  public Workspace rename(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body WorkspaceRequest body) {
    return service.rename(
        workspaceId,
        Actor.id(auth),
        body.name(),
        body.currency() == null ? "USD" : body.currency());
  }

  @Delete("/{workspaceId}")
  public void delete(@PathVariable UUID workspaceId) {
    service.delete(workspaceId);
  }
}

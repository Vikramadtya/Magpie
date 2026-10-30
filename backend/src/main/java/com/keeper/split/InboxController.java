package com.keeper.split;

import com.keeper.common.Actor;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;

/** The "to review" list: group expenses sent by the split app, waiting to be recorded. */
@Controller("/api/v1/workspaces/{workspaceId}/inbox")
@io.micronaut.validation.Validated
public class InboxController {

  @Serdeable
  public record Count(long count) {}

  private final SplitAcceptService service;

  public InboxController(SplitAcceptService service) {
    this.service = service;
  }

  /** scope=todo (default) lists what needs a decision; scope=done lists what was accepted. */
  @Get
  public List<InboxItem> list(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "todo") String scope) {
    return "done".equals(scope) ? service.done(workspaceId) : service.todo(workspaceId);
  }

  @Get("/count")
  public Count count(@PathVariable UUID workspaceId) {
    return new Count(service.count(workspaceId));
  }

  @Post("/{id}/accept")
  public InboxItem accept(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body SplitAcceptService.AcceptRequest body) {
    return service.accept(workspaceId, Actor.id(auth), id, body);
  }

  @Post("/{id}/dismiss")
  public InboxItem dismiss(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.dismiss(workspaceId, id);
  }

  @Post("/{id}/apply-update")
  public InboxItem applyUpdate(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Nullable @Valid @Body SplitAcceptService.AcceptRequest body) {
    return service.applyUpdate(workspaceId, Actor.id(auth), id, body);
  }

  @Post("/{id}/remove-records")
  public InboxItem removeRecords(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.removeRecords(workspaceId, Actor.id(auth), id);
  }

  @Post("/{id}/keep")
  public InboxItem keep(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.keep(workspaceId, id);
  }
}

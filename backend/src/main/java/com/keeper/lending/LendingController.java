package com.keeper.lending;

import com.keeper.common.Actor;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

/** The owner's side: lend an account to someone, see who has it, take it back. */
@Controller("/api/v1/workspaces/{workspaceId}")
@io.micronaut.validation.Validated
public class LendingController {

  @Serdeable
  public record LendRequest(@NotBlank @Email @Size(max = 255) String email) {}

  private final LendingService service;

  public LendingController(LendingService service) {
    this.service = service;
  }

  @Get("/accounts/{accountId}/shares")
  public List<Share> shares(@PathVariable UUID workspaceId, @PathVariable UUID accountId) {
    return service.sharesOf(workspaceId, accountId);
  }

  @Post("/accounts/{accountId}/shares")
  public Share lend(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID accountId,
      @Valid @Body LendRequest body) {
    return service.lend(workspaceId, Actor.id(auth), accountId, body.email());
  }

  @Delete("/shares/{shareId}")
  public void revoke(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID shareId) {
    service.revoke(workspaceId, Actor.id(auth), shareId);
  }
}

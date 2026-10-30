package com.keeper.split;

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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/api-tokens")
@io.micronaut.validation.Validated
public class ApiTokenController {

  @Serdeable
  public record Request(@NotBlank @Size(max = 80) String name) {}

  private final ApiTokenService tokens;

  public ApiTokenController(ApiTokenService tokens) {
    this.tokens = tokens;
  }

  @Get
  public List<ApiTokenService.TokenView> list(@PathVariable UUID workspaceId) {
    return tokens.list(workspaceId);
  }

  /** The secret is returned once; only its hash is stored. */
  @Post
  public ApiTokenService.Created create(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body Request body) {
    return tokens.create(workspaceId, Actor.id(auth), body.name());
  }

  @Delete("/{id}")
  public void revoke(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    tokens.revoke(workspaceId, id);
  }
}

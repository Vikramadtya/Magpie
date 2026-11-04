package com.keeper.refund;

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
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/refunds")
@io.micronaut.validation.Validated
public class RefundController {
  private static final long MAX_MINOR = 1_000_000_000_000L;

  @Serdeable
  public record CreateRequest(
      @NotNull UUID transactionId,
      /** Null means the whole purchase. */
      @Positive @Max(MAX_MINOR) Long expectedMinor,
      @Size(max = 1000) String note) {}

  @Serdeable
  public record UpdateRequest(
      @Positive @Max(MAX_MINOR) long expectedMinor, @Size(max = 1000) String note) {}

  @Serdeable
  public record CompleteRequest(
      @PositiveOrZero @Max(MAX_MINOR) long receivedMinor,
      @NotNull LocalDate receivedOn,
      /** When set, the money is also added to this account as income. */
      UUID accountId) {}

  private final RefundService service;

  public RefundController(RefundService service) {
    this.service = service;
  }

  @Get
  public RefundService.Overview overview(@PathVariable UUID workspaceId) {
    return service.overview(workspaceId);
  }

  @Post
  public RefundService.Refund create(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body CreateRequest body) {
    return service.create(workspaceId, Actor.id(auth), body);
  }

  @Patch("/{id}")
  public RefundService.Refund update(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body UpdateRequest body) {
    return service.update(workspaceId, Actor.id(auth), id, body);
  }

  @Post("/{id}/complete")
  public RefundService.Refund complete(
      Authentication auth,
      @PathVariable UUID workspaceId,
      @PathVariable UUID id,
      @Valid @Body CompleteRequest body) {
    return service.complete(workspaceId, Actor.id(auth), id, body);
  }

  @Delete("/{id}")
  public void delete(Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.delete(workspaceId, Actor.id(auth), id);
  }
}

package com.keeper.trip;

import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/trips")
@io.micronaut.validation.Validated
public class TripController {

  @Serdeable
  public record Request(
      @NotBlank @Size(max = 160) String name,
      @NotNull LocalDate startDate,
      @NotNull LocalDate endDate,
      @Positive @Max(1_000_000_000_000L) Long budgetMinor,
      @Size(max = 2000) String notes) {}

  @Serdeable
  public record Ids(@NotNull @Size(min = 1, max = 500) List<UUID> ids) {}

  @Serdeable
  public record Count(int affected) {}

  private final TripService service;

  public TripController(TripService service) {
    this.service = service;
  }

  @Get
  public List<TripService.Trip> list(@PathVariable UUID workspaceId) {
    return service.list(workspaceId);
  }

  @Post
  public TripService.Trip create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    return service.create(workspaceId, body);
  }

  @Get("/{id}")
  public TripService.Detail detail(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.detail(workspaceId, id);
  }

  @Put("/{id}")
  public TripService.Trip update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    return service.update(workspaceId, id, body);
  }

  @Delete("/{id}")
  public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.delete(workspaceId, id);
  }

  /** Attach specific expenses to the trip. */
  @Post("/{id}/assign")
  public Count assign(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Ids body) {
    return new Count(service.assign(workspaceId, id, body.ids()));
  }

  /** Attach every everyday expense dated within the trip (recurring bills are skipped). */
  @Post("/{id}/assign-range")
  public Count assignRange(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return new Count(service.assignRange(workspaceId, id));
  }

  /** Detach the trip from these expenses. */
  @Post("/unassign")
  public Count unassign(@PathVariable UUID workspaceId, @Valid @Body Ids body) {
    return new Count(service.unassign(workspaceId, body.ids()));
  }

  /** Detach every expense from the trip (the expenses themselves are untouched). */
  @Post("/{id}/clear")
  public Count clear(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return new Count(service.clear(workspaceId, id));
  }
}

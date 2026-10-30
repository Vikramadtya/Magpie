package com.keeper.goal;

import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Patch;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/goals")
@io.micronaut.validation.Validated
public class GoalController {

  @Serdeable
  public record Request(
      @NotBlank @Size(max = 160) String name,
      @Positive @Max(1_000_000_000_000L) long targetMinor,
      @NotBlank @Pattern(regexp = "^[A-Za-z]{3}$") String currency,
      LocalDate targetDate) {}

  @Serdeable
  public record Contribution(
      @Max(1_000_000_000_000L) long amountMinor, @NotNull LocalDate occurredOn) {}

  private final GoalService service;

  public GoalController(GoalService service) {
    this.service = service;
  }

  @Get
  public List<GoalService.Goal> list(@PathVariable UUID workspaceId) {
    return service.list(workspaceId);
  }

  @Post
  public GoalService.Goal create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    return service.create(workspaceId, body);
  }

  @Patch("/{id}")
  public GoalService.Goal update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    return service.update(workspaceId, id, body);
  }

  @Delete("/{id}")
  public void archive(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.archive(workspaceId, id);
  }

  @Post("/{id}/contributions")
  public GoalService.Goal contribute(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Contribution body) {
    if (body.amountMinor() == 0)
      throw new com.keeper.common.exception.BadRequestException("Amount cannot be zero");
    return service.contribute(workspaceId, id, body.amountMinor(), body.occurredOn());
  }
}

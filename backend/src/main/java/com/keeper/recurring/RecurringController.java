package com.keeper.recurring;

import com.keeper.common.Actor;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/recurring")
@io.micronaut.validation.Validated
public class RecurringController {

  @Serdeable
  public record Request(
      @NotBlank @Size(max = 160) String name,
      @NotNull UUID accountId,
      UUID categoryId,
      UUID payeeId,
      @NotNull @Pattern(regexp = "^(INCOME|EXPENSE)$") String type,
      @Positive @Max(1_000_000_000_000L) long amountMinor,
      String currency,
      @NotNull Frequency frequency,
      @Min(1) @Max(52) int intervalN,
      @NotNull LocalDate startOn,
      LocalDate endOn,
      boolean autoPost) {}

  private final RecurringService service;

  public RecurringController(RecurringService service) {
    this.service = service;
  }

  @Get
  public List<RecurringRule> list(@PathVariable UUID workspaceId) {
    return service.list(workspaceId);
  }

  @Get("/upcoming")
  public List<RecurringService.Upcoming> upcoming(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "30") @Min(1) @Max(366) int days) {
    return service.upcoming(workspaceId, days);
  }

  @Post
  public RecurringRule create(
      Authentication auth, @PathVariable UUID workspaceId, @Valid @Body Request body) {
    return service.create(workspaceId, Actor.id(auth), body);
  }

  @Put("/{id}")
  public RecurringRule update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    return service.update(workspaceId, id, body);
  }

  @Post("/{id}/post-now")
  public RecurringRule postNow(
      Authentication auth, @PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.postNow(workspaceId, Actor.id(auth), id);
  }

  @Post("/{id}/pause")
  public void pause(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.setStatus(workspaceId, id, "PAUSED");
  }

  @Post("/{id}/resume")
  public void resume(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.setStatus(workspaceId, id, "ACTIVE");
  }

  @Delete("/{id}")
  public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.delete(workspaceId, id);
  }
}

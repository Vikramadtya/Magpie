package com.keeper.rule;

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
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/rules")
@io.micronaut.validation.Validated
public class RuleController {
  private static final long MAX = 1_000_000_000_000L;

  @Serdeable
  public record Request(
      @NotBlank @Size(max = 100) String name,
      @Size(max = 200) String text,
      @Pattern(regexp = "^(CONTAINS|STARTS_WITH|EQUALS)$") String textOp,
      @Pattern(regexp = "^(GT|LT|EQ|BETWEEN)$") String amountOp,
      @Min(0) @Max(MAX) Long amountMin,
      @Min(0) @Max(MAX) Long amountMax,
      @Pattern(regexp = "^(INCOME|EXPENSE)$") String type,
      @NotNull UUID categoryId,
      Boolean active) {}

  @Serdeable
  public record Order(@Size(max = 500) List<UUID> ids) {}

  private final RuleService service;

  public RuleController(RuleService service) {
    this.service = service;
  }

  @Get
  public List<RuleService.Rule> list(@PathVariable UUID workspaceId) {
    return service.list(workspaceId);
  }

  @Post
  public RuleService.Rule create(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    return service.create(workspaceId, body);
  }

  @Put("/{id}")
  public RuleService.Rule update(
      @PathVariable UUID workspaceId, @PathVariable UUID id, @Valid @Body Request body) {
    return service.update(workspaceId, id, body);
  }

  @Delete("/{id}")
  public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    service.delete(workspaceId, id);
  }

  @Put("/order")
  public void order(@PathVariable UUID workspaceId, @Valid @Body Order body) {
    service.reorder(workspaceId, body.ids());
  }

  /** How many uncategorised entries this rule would catch, before saving it. */
  @Post("/test")
  public RuleService.Test test(@PathVariable UUID workspaceId, @Valid @Body Request body) {
    return service.test(workspaceId, body);
  }

  @Post("/apply")
  public RuleService.Applied applyAll(@PathVariable UUID workspaceId) {
    return service.applyAll(workspaceId);
  }

  @Post("/{id}/apply")
  public RuleService.Applied applyOne(@PathVariable UUID workspaceId, @PathVariable UUID id) {
    return service.applyOne(workspaceId, id);
  }
}

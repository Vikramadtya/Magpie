package com.keeper.budget;

import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.micronaut.http.annotation.QueryValue;
import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.YearMonth;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/budgets")
@io.micronaut.validation.Validated
public class BudgetController {

  @Serdeable
  public record Request(@Min(0) @Max(1_000_000_000_000L) long amountMinor, boolean rollover) {}

  @Serdeable
  public record Copied(int copied) {}

  private final BudgetService service;

  public BudgetController(BudgetService service) {
    this.service = service;
  }

  @Get
  public BudgetService.Summary summary(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "") String month) {
    return service.summary(workspaceId, parse(month));
  }

  @Put("/{categoryId}/{month}")
  public void set(
      @PathVariable UUID workspaceId,
      @PathVariable UUID categoryId,
      @PathVariable String month,
      @Valid @Body Request body) {
    service.set(workspaceId, categoryId, parse(month), body.amountMinor(), body.rollover());
  }

  @Delete("/{categoryId}/{month}")
  public void remove(
      @PathVariable UUID workspaceId, @PathVariable UUID categoryId, @PathVariable String month) {
    service.remove(workspaceId, categoryId, parse(month));
  }

  @Post("/copy-previous")
  public Copied copyPrevious(@PathVariable UUID workspaceId, @QueryValue String month) {
    return new Copied(service.copyPrevious(workspaceId, parse(month)));
  }

  static YearMonth parse(String month) {
    try {
      return month == null || month.isBlank() ? YearMonth.now() : YearMonth.parse(month);
    } catch (java.time.format.DateTimeParseException e) {
      throw new com.keeper.common.exception.BadRequestException("month must be YYYY-MM");
    }
  }
}

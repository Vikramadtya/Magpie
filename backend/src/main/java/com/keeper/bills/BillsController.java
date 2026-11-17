package com.keeper.bills;

import com.keeper.common.exception.BadRequestException;
import com.keeper.forecast.InsightsService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.QueryValue;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/bills")
public class BillsController {
  private final BillsService service;

  public BillsController(BillsService service) {
    this.service = service;
  }

  @Get("/calendar")
  public BillsService.Calendar calendar(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "") String month) {
    try {
      return service.calendar(
          workspaceId, month.isBlank() ? YearMonth.now() : YearMonth.parse(month));
    } catch (java.time.format.DateTimeParseException e) {
      throw new BadRequestException("month must be YYYY-MM");
    }
  }

  @Get("/suggestions")
  public List<InsightsService.Subscription> suggestions(@PathVariable UUID workspaceId) {
    return service.suggestions(workspaceId);
  }
}

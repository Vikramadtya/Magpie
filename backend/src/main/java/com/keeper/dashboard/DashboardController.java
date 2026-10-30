package com.keeper.dashboard;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.QueryValue;
import java.time.YearMonth;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/dashboard")
public class DashboardController {
  private final DashboardService service;

  public DashboardController(DashboardService service) {
    this.service = service;
  }

  @Get
  public DashboardService.Dashboard get(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "") String month) {
    YearMonth m;
    try {
      m = month.isBlank() ? YearMonth.now() : YearMonth.parse(month);
    } catch (java.time.format.DateTimeParseException e) {
      throw new com.keeper.common.exception.BadRequestException("month must be YYYY-MM");
    }
    return service.load(workspaceId, m);
  }
}

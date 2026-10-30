package com.keeper.analytics;

import com.keeper.common.exception.BadRequestException;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.QueryValue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}/analytics")
@io.micronaut.validation.Validated
public class AnalyticsController {
  private final AnalyticsService service;

  public AnalyticsController(AnalyticsService service) {
    this.service = service;
  }

  @Get("/spending-by-category")
  public AnalyticsService.Report<AnalyticsService.CategorySpend> spending(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to) {
    LocalDate[] range = range(from, to);
    return service.spendingByCategory(workspaceId, range[0], range[1]);
  }

  @Get("/cash-flow")
  public AnalyticsService.Report<AnalyticsService.MonthFlow> cashFlow(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to) {
    LocalDate[] range = range(from, to == null ? LocalDate.now() : to);
    if (from == null) range[0] = range[1].minusMonths(11).withDayOfMonth(1);
    return service.cashFlow(workspaceId, range[0], range[1]);
  }

  @Get("/net-worth")
  public AnalyticsService.Report<AnalyticsService.NetWorthPoint> netWorth(
      @PathVariable UUID workspaceId,
      @QueryValue(defaultValue = "12") @Min(1) @Max(60) int months) {
    return service.netWorth(workspaceId, months);
  }

  @Get("/top-payees")
  public AnalyticsService.Report<AnalyticsService.PayeeSpend> topPayees(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to,
      @QueryValue(defaultValue = "10") int limit) {
    LocalDate[] range = range(from, to);
    return service.topPayees(workspaceId, range[0], range[1], limit);
  }

  /** Defaults to the current month; rejects ranges wider than ~5 years. */
  private static LocalDate[] range(LocalDate from, LocalDate to) {
    LocalDate end = to == null ? LocalDate.now() : to;
    LocalDate start = from == null ? end.withDayOfMonth(1) : from;
    if (start.isAfter(end)) throw new BadRequestException("from must not be after to");
    if (start.plusYears(5).isBefore(end)) throw new BadRequestException("Range too large");
    return new LocalDate[] {start, end};
  }
}

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

  private final OverviewService overview;
  private final BreakdownService breakdown;
  private final WealthService wealth;
  private final DetailService detail;
  private final com.keeper.budget.BudgetService budgets;

  public AnalyticsController(
      AnalyticsService service,
      OverviewService overview,
      BreakdownService breakdown,
      WealthService wealth,
      DetailService detail,
      com.keeper.budget.BudgetService budgets) {
    this.service = service;
    this.overview = overview;
    this.breakdown = breakdown;
    this.wealth = wealth;
    this.detail = detail;
    this.budgets = budgets;
  }

  /**
   * Money grouped by one thing (by) and optionally by day or month (bucket), with optional filters.
   * by: none, category, subcategory, payee, account, tag, trip, person, currency, weekday, daypart,
   * kind.
   */
  @Get("/breakdown")
  public BreakdownService.Result breakdown(
      @PathVariable UUID workspaceId,
      @QueryValue(defaultValue = "category") String by,
      @QueryValue(defaultValue = "none") String bucket,
      @QueryValue(defaultValue = "EXPENSE") String type,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to,
      @Nullable @QueryValue UUID categoryId,
      @Nullable @QueryValue UUID accountId,
      @Nullable @QueryValue UUID payeeId,
      @Nullable @QueryValue UUID tagId,
      @Nullable @QueryValue UUID tripId,
      @Nullable @QueryValue UUID personId,
      @QueryValue(defaultValue = "12") @Min(0) @Max(50) int limit) {
    LocalDate[] range = range(from, to);
    return breakdown.run(
        workspaceId,
        new BreakdownService.Query(
            by,
            bucket,
            range[0],
            range[1],
            type,
            categoryId,
            accountId,
            payeeId,
            tagId,
            tripId,
            personId,
            limit));
  }

  @Get("/sizes")
  public DetailService.Sizes sizes(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to) {
    LocalDate[] range = range(from, to);
    return detail.sizes(workspaceId, range[0], range[1]);
  }

  @Get("/purchases")
  public DetailService.Purchases purchases(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to,
      @QueryValue(defaultValue = "100") @Min(1) @Max(500) int limit) {
    LocalDate[] range = range(from, to);
    return detail.purchases(workspaceId, range[0], range[1], limit);
  }

  @Get("/tree")
  public DetailService.Tree tree(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to) {
    LocalDate[] range = range(from, to);
    return detail.tree(workspaceId, range[0], range[1]);
  }

  /** Month-end balance of every account, investments and own-value assets. */
  @Get("/wealth")
  public WealthService.Wealth wealth(
      @PathVariable UUID workspaceId,
      @QueryValue(defaultValue = "12") @Min(2) @Max(60) int months) {
    return wealth.wealth(workspaceId, months);
  }

  @Get("/investments")
  public WealthService.Investments investments(@PathVariable UUID workspaceId) {
    return wealth.investments(workspaceId);
  }

  @Get("/loans")
  public WealthService.Loans loans(
      @PathVariable UUID workspaceId,
      @QueryValue(defaultValue = "12") @Min(2) @Max(60) int months) {
    return wealth.loans(workspaceId, months);
  }

  @Get("/goals")
  public java.util.List<WealthService.GoalProgress> goals(@PathVariable UUID workspaceId) {
    return wealth.goals(workspaceId);
  }

  /** The budget summary of each of the last months, oldest first. */
  @Get("/budgets")
  public java.util.List<com.keeper.budget.BudgetService.Summary> budgets(
      @PathVariable UUID workspaceId, @QueryValue(defaultValue = "6") @Min(1) @Max(24) int months) {
    java.time.YearMonth last = java.time.YearMonth.now();
    java.util.List<com.keeper.budget.BudgetService.Summary> out = new java.util.ArrayList<>();
    for (int i = months - 1; i >= 0; i--)
      out.add(budgets.summary(workspaceId, last.minusMonths(i)));
    return out;
  }

  /** Period vs the one before, category changes, biggest purchases and the monthly mix. */
  @Get("/overview")
  public OverviewService.Overview overview(
      @PathVariable UUID workspaceId,
      @Nullable @QueryValue LocalDate from,
      @Nullable @QueryValue LocalDate to) {
    LocalDate[] range = range(from, to);
    return overview.overview(workspaceId, range[0], range[1]);
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

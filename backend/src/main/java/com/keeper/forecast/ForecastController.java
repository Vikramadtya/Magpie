package com.keeper.forecast;

import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import java.util.UUID;

@Controller("/api/v1/workspaces/{workspaceId}")
public class ForecastController {
  private final ForecastService forecasts;
  private final InsightsService insights;

  public ForecastController(ForecastService forecasts, InsightsService insights) {
    this.forecasts = forecasts;
    this.insights = insights;
  }

  @Get("/forecast")
  public ForecastService.Forecast forecast(@PathVariable UUID workspaceId) {
    return forecasts.forecast(workspaceId);
  }

  @Get("/insights")
  public InsightsService.Insights insights(@PathVariable UUID workspaceId) {
    return insights.insights(workspaceId);
  }
}

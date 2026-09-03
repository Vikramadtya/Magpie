package com.keeper.dashboard;

import com.keeper.api.DashboardApi;
import com.keeper.dto.*;
import io.micronaut.http.annotation.Controller;
import java.util.*;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class DashboardController implements DashboardApi {

  private final DashboardService dashboardService;

  @Override
  public DashboardDataDTO getDashboard(
      UUID workspaceId,
      java.time.LocalDate startDate,
      java.time.LocalDate endDate,
      String baseCurrency) {
    return null;
  }
}

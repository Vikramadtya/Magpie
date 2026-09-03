package com.keeper.budget;

import com.keeper.api.BudgetApi;
import com.keeper.dto.*;
import io.micronaut.http.annotation.Controller;
import java.util.*;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class BudgetController implements BudgetApi {

  private final BudgetService budgetService;

  @Override
  public BudgetDTO createBudget(UUID workspaceId, BudgetDTO budgetDTO) {
    return budgetService.createBudget(workspaceId, budgetDTO);
  }

  @Override
  public void deleteBudget(UUID workspaceId, UUID id) {
    budgetService.deleteBudget(workspaceId, id);
  }

  @Override
  public java.util.List<BudgetDTO> getBudgets(UUID workspaceId, String period, UUID categoryId) {
    return budgetService.getBudgets(workspaceId, period, categoryId);
  }

  @Override
  public BudgetDTO updateBudget(UUID workspaceId, UUID id, BudgetDTO budgetDTO) {
    return budgetService.updateBudget(workspaceId, id, budgetDTO);
  }

  @Override
  public BudgetSummaryDTO getBudgetSummary(UUID workspaceId) {
    return budgetService.getBudgetSummary(workspaceId);
  }
}

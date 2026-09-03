package com.keeper.budget;

import com.keeper.dto.*;
import java.util.*;

public interface BudgetService {
  BudgetDTO createBudget(UUID workspaceId, BudgetDTO budgetDTO);

  void deleteBudget(UUID workspaceId, UUID id);

  java.util.List<BudgetDTO> getBudgets(UUID workspaceId, String period, UUID categoryId);

  BudgetDTO updateBudget(UUID workspaceId, UUID id, BudgetDTO budgetDTO);

  BudgetSummaryDTO getBudgetSummary(UUID workspaceId);
}

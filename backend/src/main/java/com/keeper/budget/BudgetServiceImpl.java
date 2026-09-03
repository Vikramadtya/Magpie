package com.keeper.budget;

import com.keeper.dto.*;
import jakarta.inject.Singleton;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class BudgetServiceImpl implements BudgetService {
  // private final BudgetRepository budgetRepository;

  @Override
  public BudgetDTO createBudget(UUID workspaceId, BudgetDTO budgetDTO) {
    // TODO: Implement actual business logic
    return new BudgetDTO(
        java.util.UUID.randomUUID(),
        "Mock Budget",
        new java.math.BigDecimal("1000.00"),
        new java.math.BigDecimal("250.00"),
        "MONTHLY");
  }

  @Override
  public void deleteBudget(UUID workspaceId, UUID id) {
    // TODO: Implement actual business logic
  }

  @Override
  public java.util.List<BudgetDTO> getBudgets(UUID workspaceId, String period, UUID categoryId) {
    // TODO: Implement actual business logic
    return java.util.List.of(
        new BudgetDTO(
            java.util.UUID.randomUUID(),
            "Mock Budget",
            new java.math.BigDecimal("1000.00"),
            new java.math.BigDecimal("250.00"),
            "MONTHLY"));
  }

  @Override
  public BudgetDTO updateBudget(UUID workspaceId, UUID id, BudgetDTO budgetDTO) {
    // TODO: Implement actual business logic
    return new BudgetDTO(
        java.util.UUID.randomUUID(),
        "Mock Budget",
        new java.math.BigDecimal("1000.00"),
        new java.math.BigDecimal("250.00"),
        "MONTHLY");
  }

  @Override
  public BudgetSummaryDTO getBudgetSummary(UUID workspaceId) {
    // TODO: Implement actual business logic
    return null;
  }
}

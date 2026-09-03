package com.keeper.goal;

import com.keeper.dto.*;
import jakarta.inject.Singleton;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class GoalServiceImpl implements GoalService {
  // private final GoalRepository goalRepository;

  @Override
  public GoalDTO createGoal(UUID workspaceId, GoalDTO goalDTO) {
    // TODO: Implement actual business logic
    return new GoalDTO(
        java.util.UUID.randomUUID(),
        "Mock Goal",
        new java.math.BigDecimal("5000.00"),
        new java.math.BigDecimal("1000.00"),
        1,
        "#FFFFFF");
  }

  @Override
  public void deleteGoal(UUID workspaceId, UUID id) {
    // TODO: Implement actual business logic
  }

  @Override
  public java.util.List<GoalDTO> getGoals(UUID workspaceId, String status) {
    // TODO: Implement actual business logic
    return java.util.List.of(
        new GoalDTO(
            java.util.UUID.randomUUID(),
            "Mock Goal",
            new java.math.BigDecimal("5000.00"),
            new java.math.BigDecimal("1000.00"),
            1,
            "#FFFFFF"));
  }

  @Override
  public GoalDTO updateGoal(UUID workspaceId, UUID id, GoalDTO goalDTO) {
    // TODO: Implement actual business logic
    return new GoalDTO(
        java.util.UUID.randomUUID(),
        "Mock Goal",
        new java.math.BigDecimal("5000.00"),
        new java.math.BigDecimal("1000.00"),
        1,
        "#FFFFFF");
  }
}

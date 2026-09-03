package com.keeper.goal;

import com.keeper.api.GoalApi;
import com.keeper.dto.*;
import io.micronaut.http.annotation.Controller;
import java.util.*;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class GoalController implements GoalApi {

  private final GoalService goalService;

  @Override
  public GoalDTO createGoal(UUID workspaceId, GoalDTO goalDTO) {
    return goalService.createGoal(workspaceId, goalDTO);
  }

  @Override
  public void deleteGoal(UUID workspaceId, UUID id) {
    goalService.deleteGoal(workspaceId, id);
  }

  @Override
  public java.util.List<GoalDTO> getGoals(UUID workspaceId, String status) {
    return goalService.getGoals(workspaceId, status);
  }

  @Override
  public GoalDTO updateGoal(UUID workspaceId, UUID id, GoalDTO goalDTO) {
    return goalService.updateGoal(workspaceId, id, goalDTO);
  }
}

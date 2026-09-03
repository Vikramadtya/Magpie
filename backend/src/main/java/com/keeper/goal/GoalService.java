package com.keeper.goal;

import com.keeper.dto.*;
import java.util.*;

public interface GoalService {
  GoalDTO createGoal(UUID workspaceId, GoalDTO goalDTO);

  void deleteGoal(UUID workspaceId, UUID id);

  java.util.List<GoalDTO> getGoals(UUID workspaceId, String status);

  GoalDTO updateGoal(UUID workspaceId, UUID id, GoalDTO goalDTO);
}

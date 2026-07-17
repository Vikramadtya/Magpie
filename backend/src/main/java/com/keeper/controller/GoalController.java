package com.keeper.controller;

import com.keeper.domain.Goal;
import com.keeper.service.GoalService;
import com.keeper.dto.GoalDTO;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;

import java.util.List;
import java.util.UUID;

@Controller("/api/v1/goals")
public class GoalController {
    
    private final GoalService goalService;

    @Inject
    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    @Get("/{workspaceId}")
    public List<Goal> list(@PathVariable UUID workspaceId) {
        return goalService.getGoals(workspaceId);
    }

    @Post("/{workspaceId}")
    public Goal create(@PathVariable UUID workspaceId, @Body GoalDTO dto) {
        return goalService.createGoal(
            workspaceId, 
            dto.name(), 
            dto.targetAmount(), 
            dto.targetCurrency() != null ? dto.targetCurrency() : "USD", 
            dto.dueDate(), 
            dto.priority() != null ? dto.priority() : 1
        );
    }

    @Put("/{workspaceId}/{goalId}")
    public Goal update(@PathVariable UUID workspaceId, @PathVariable UUID goalId, @Body GoalDTO dto) {
        throw new UnsupportedOperationException("Update not supported yet");
    }

    @Delete("/{workspaceId}/{goalId}")
    public void delete(@PathVariable UUID workspaceId, @PathVariable UUID goalId) {
        throw new UnsupportedOperationException("Delete not supported yet");
    }
}

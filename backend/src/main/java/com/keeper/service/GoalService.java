package com.keeper.service;

import com.keeper.domain.Goal;
import com.keeper.repository.GoalRepository;
import lombok.RequiredArgsConstructor;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Singleton
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;

    @Transactional
    public Goal createGoal(UUID workspaceId, String name, Long targetAmount, String targetCurrency, 
                           LocalDate dueDate, Integer priority) {
        Goal goal = Goal.builder()
            .workspaceId(workspaceId)
            .id(UUID.randomUUID())
            .name(name)
            .targetAmount(targetAmount)
            .savedAmount(0L)
            .targetCurrency(targetCurrency)
            .dueDate(dueDate)
            .priority(priority != null ? priority : 0)
            .createdAt(Instant.now())
            .build();
            
        return goalRepository.save(goal);
    }
    
    @Transactional
    public void addFundsToGoal(UUID workspaceId, UUID goalId, Long amount) {
        // Find goal, update savedAmount
    }

    @Transactional
    public List<Goal> getGoals(UUID workspaceId) {
        return goalRepository.findByWorkspaceId(workspaceId);
    }
}

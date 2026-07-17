package com.keeper.service;

import com.keeper.domain.Budget;
import com.keeper.domain.enums.BudgetPeriod;
import com.keeper.repository.BudgetRepository;
import lombok.RequiredArgsConstructor;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Singleton
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;

    @Transactional
    public Budget createBudget(UUID workspaceId, UUID categoryId, String name, Long amountLimit, BudgetPeriod period) {
        Budget budget = Budget.builder()
            .workspaceId(workspaceId)
            .id(UUID.randomUUID())
            .accountId(categoryId)
            .name(name)
            .amountLimit(amountLimit)
            .period(period)
            .isActive(true)
            .createdAt(Instant.now())
            .build();
            
        return budgetRepository.save(budget);
    }

    @Transactional
    public List<Budget> getBudgets(UUID workspaceId) {
        return budgetRepository.findByWorkspaceId(workspaceId);
    }
    
    // Note: getBudgetUtilization would ideally run a native query leveraging the ltree path to sum up
    // all expenses across the category tree for the specific budget period.
}

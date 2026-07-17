package com.keeper.controller;

import com.keeper.domain.Budget;
import com.keeper.service.BudgetService;
import com.keeper.dto.BudgetDTO;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;

import java.util.List;
import java.util.UUID;

@Controller("/api/v1/budgets")
public class BudgetController {
    
    private final BudgetService budgetService;

    @Inject
    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @Get("/{workspaceId}")
    public List<Budget> list(@PathVariable UUID workspaceId) {
        return budgetService.getBudgets(workspaceId);
    }

    @Post("/{workspaceId}")
    public Budget create(@PathVariable UUID workspaceId, @Body BudgetDTO dto) {
        return budgetService.createBudget(workspaceId, dto.categoryId(), dto.name(), dto.amountLimit(), dto.period());
    }

    @Put("/{workspaceId}/{budgetId}")
    public Budget update(@PathVariable UUID workspaceId, @PathVariable UUID budgetId, @Body BudgetDTO dto) {
        throw new UnsupportedOperationException("Update not supported yet");
    }

    @Delete("/{workspaceId}/{budgetId}")
    public void delete(@PathVariable UUID workspaceId, @PathVariable UUID budgetId) {
        throw new UnsupportedOperationException("Delete not supported yet");
    }
}

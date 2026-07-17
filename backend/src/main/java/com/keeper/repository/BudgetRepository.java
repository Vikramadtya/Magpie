package com.keeper.repository;

import com.keeper.domain.Budget;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface BudgetRepository extends CrudRepository<Budget, com.keeper.domain.keys.WorkspaceIdKey> {
    List<Budget> findByWorkspaceId(UUID workspaceId);
}

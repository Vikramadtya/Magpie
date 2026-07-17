package com.keeper.repository;

import com.keeper.domain.Goal;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface GoalRepository extends CrudRepository<Goal, com.keeper.domain.keys.WorkspaceIdKey> {
    List<Goal> findByWorkspaceId(UUID workspaceId);
}

package com.keeper.repository;

import com.keeper.domain.Category;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface CategoryRepository extends CrudRepository<Category, com.keeper.domain.keys.WorkspaceIdKey> {
    List<Category> findByWorkspaceId(UUID workspaceId);
}

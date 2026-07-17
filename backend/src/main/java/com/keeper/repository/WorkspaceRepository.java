package com.keeper.repository;

import com.keeper.domain.Workspace;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface WorkspaceRepository extends CrudRepository<Workspace, UUID> {
    
}

package com.keeper.workspace;

import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.List;
import java.util.UUID;

@Repository
public interface WorkspaceRepository extends CrudRepository<Workspace, UUID> {
  List<Workspace> findByUserId(UUID userId);
}

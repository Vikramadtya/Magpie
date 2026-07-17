package com.keeper.repository;

import com.keeper.domain.Payee;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface PayeeRepository extends CrudRepository<Payee, com.keeper.domain.keys.WorkspaceIdKey> {
    List<Payee> findByWorkspaceId(UUID workspaceId);
}

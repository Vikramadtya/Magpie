package com.keeper.repository;

import com.keeper.domain.Ledger;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface LedgerRepository extends CrudRepository<Ledger, com.keeper.domain.keys.WorkspaceIdKey> {
    List<Ledger> findByWorkspaceId(UUID workspaceId);
}

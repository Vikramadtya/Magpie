package com.keeper.repository;

import com.keeper.domain.Transaction;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface TransactionRepository extends CrudRepository<Transaction, com.keeper.domain.keys.WorkspaceIdKey> {
    List<Transaction> findByWorkspaceId(UUID workspaceId);
}

package com.keeper.repository;

import com.keeper.domain.Account;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

@Repository
public interface AccountRepository extends CrudRepository<Account, com.keeper.domain.keys.WorkspaceIdKey> {
    List<Account> findByWorkspaceId(UUID workspaceId);
}

package com.keeper.repository;

import com.keeper.domain.AccountBalance;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.repository.CrudRepository;
import java.util.UUID;
import java.util.List;

import io.micronaut.data.annotation.Query;

@Repository
public interface AccountBalanceRepository extends CrudRepository<AccountBalance, com.keeper.domain.keys.AccountBalanceKey> {
    List<AccountBalance> findByWorkspaceId(UUID workspaceId);
    
    @Query(value = "UPDATE account_balances SET functional_balance = functional_balance + :amount, native_balance = native_balance + :amount, last_updated_at = NOW() WHERE workspace_id = :workspaceId AND account_id = :accountId", nativeQuery = true)
    void incrementBalance(UUID workspaceId, UUID accountId, Long amount);
}

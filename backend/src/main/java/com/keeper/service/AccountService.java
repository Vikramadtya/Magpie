package com.keeper.service;

import com.keeper.domain.Account;
import com.keeper.repository.AccountRepository;
import jakarta.inject.Singleton;

@Singleton
public class AccountService {

    private final AccountRepository accountRepository;

    public AccountService(AccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public java.util.Optional<Account> getAccount(java.util.UUID workspaceId, java.util.UUID id) {
        return accountRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, id));
    }
}

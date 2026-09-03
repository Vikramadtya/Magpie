package com.keeper.account;

import com.keeper.dto.*;
import jakarta.inject.Singleton;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class AccountServiceImpl implements AccountService {
  // private final AccountRepository accountRepository;

  @Override
  public AccountDTO createAccount(UUID workspaceId, AccountCreateDTO accountCreateDTO) {
    // TODO: Implement actual business logic
    return new AccountDTO(
        java.util.UUID.randomUUID(),
        "Mock Account",
        "CHECKING",
        "USD",
        new java.math.BigDecimal("1500.00"));
  }

  @Override
  public void deleteAccount(UUID workspaceId, UUID id) {
    // TODO: Implement actual business logic
  }

  @Override
  public java.util.List<AccountDTO> getAccounts(UUID workspaceId, String type, String status) {
    // TODO: Implement actual business logic
    return java.util.List.of(
        new AccountDTO(
            java.util.UUID.randomUUID(),
            "Mock Account",
            "CHECKING",
            "USD",
            new java.math.BigDecimal("1500.00")));
  }

  @Override
  public AccountDTO updateAccount(UUID workspaceId, UUID id, AccountDTO accountDTO) {
    // TODO: Implement actual business logic
    return new AccountDTO(
        java.util.UUID.randomUUID(),
        "Mock Account",
        "CHECKING",
        "USD",
        new java.math.BigDecimal("1500.00"));
  }
}

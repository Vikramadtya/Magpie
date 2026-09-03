package com.keeper.account;

import com.keeper.api.AccountApi;
import com.keeper.dto.*;
import io.micronaut.http.annotation.Controller;
import java.util.*;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class AccountController implements AccountApi {

  private final AccountService accountService;

  @Override
  public AccountDTO createAccount(UUID workspaceId, AccountCreateDTO accountCreateDTO) {
    return accountService.createAccount(workspaceId, accountCreateDTO);
  }

  @Override
  public void deleteAccount(UUID workspaceId, UUID id) {
    accountService.deleteAccount(workspaceId, id);
  }

  @Override
  public java.util.List<AccountDTO> getAccounts(UUID workspaceId, String type, String status) {
    return accountService.getAccounts(workspaceId, type, status);
  }

  @Override
  public AccountDTO updateAccount(UUID workspaceId, UUID id, AccountDTO accountDTO) {
    return accountService.updateAccount(workspaceId, id, accountDTO);
  }
}

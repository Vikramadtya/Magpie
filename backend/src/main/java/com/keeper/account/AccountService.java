package com.keeper.account;

import com.keeper.dto.*;
import java.util.*;

public interface AccountService {
  AccountDTO createAccount(UUID workspaceId, AccountCreateDTO accountCreateDTO);

  void deleteAccount(UUID workspaceId, UUID id);

  java.util.List<AccountDTO> getAccounts(UUID workspaceId, String type, String status);

  AccountDTO updateAccount(UUID workspaceId, UUID id, AccountDTO accountDTO);
}

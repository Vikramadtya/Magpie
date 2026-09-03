package com.keeper.transaction;

import com.keeper.dto.*;
import java.util.*;

public interface TransactionService {
  TransactionDTO createTransaction(UUID workspaceId, TransactionCreateDTO transactionCreateDTO);

  void deleteTransaction(UUID workspaceId, UUID id);

  PageTransactionDTO getTransactions(
      UUID workspaceId,
      Integer page,
      Integer size,
      String sort,
      java.time.LocalDate startDate,
      java.time.LocalDate endDate,
      UUID accountId,
      UUID categoryId,
      UUID payeeId,
      String type,
      String search);

  TransactionDTO updateTransaction(
      UUID workspaceId, UUID id, TransactionCreateDTO transactionCreateDTO);
}

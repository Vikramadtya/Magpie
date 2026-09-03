package com.keeper.transaction;

import com.keeper.api.TransactionApi;
import com.keeper.dto.*;
import io.micronaut.http.annotation.Controller;
import java.util.*;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class TransactionController implements TransactionApi {

  private final TransactionService transactionService;

  @Override
  public TransactionDTO createTransaction(
      UUID workspaceId, TransactionCreateDTO transactionCreateDTO) {
    return transactionService.createTransaction(workspaceId, transactionCreateDTO);
  }

  @Override
  public void deleteTransaction(UUID workspaceId, UUID id) {
    transactionService.deleteTransaction(workspaceId, id);
  }

  @Override
  public java.util.Map<String, java.util.List<TransactionDTO>> getGroupedTransactions(
      UUID workspaceId,
      UUID accountId,
      java.time.LocalDate startDate,
      java.time.LocalDate endDate,
      String type,
      String search) {
    return null;
  }

  @Override
  public PageTransactionDTO getTransactions(
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
      String search) {
    return transactionService.getTransactions(
        workspaceId,
        page,
        size,
        sort,
        startDate,
        endDate,
        accountId,
        categoryId,
        payeeId,
        type,
        search);
  }

  @Override
  public TransactionDTO updateTransaction(
      UUID workspaceId, UUID id, TransactionCreateDTO transactionCreateDTO) {
    return transactionService.updateTransaction(workspaceId, id, transactionCreateDTO);
  }
}

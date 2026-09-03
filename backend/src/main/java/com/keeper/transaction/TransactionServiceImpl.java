package com.keeper.transaction;

import com.keeper.dto.*;
import jakarta.inject.Singleton;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Singleton
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {
  // private final TransactionRepository transactionRepository;

  @Override
  public TransactionDTO createTransaction(
      UUID workspaceId, TransactionCreateDTO transactionCreateDTO) {
    // TODO: Implement actual business logic
    return new TransactionDTO(
        java.util.UUID.randomUUID(),
        new java.math.BigDecimal("12.50"),
        "EXPENSE",
        java.time.LocalDate.now(),
        "mock-acc",
        "mock-cat");
  }

  @Override
  public void deleteTransaction(UUID workspaceId, UUID id) {
    // TODO: Implement actual business logic
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
    // TODO: Implement actual business logic
    return null;
  }

  @Override
  public TransactionDTO updateTransaction(
      UUID workspaceId, UUID id, TransactionCreateDTO transactionCreateDTO) {
    // TODO: Implement actual business logic
    return new TransactionDTO(
        java.util.UUID.randomUUID(),
        new java.math.BigDecimal("12.50"),
        "EXPENSE",
        java.time.LocalDate.now(),
        "mock-acc",
        "mock-cat");
  }
}

package com.keeper.controller;

import com.keeper.domain.Transaction;
import com.keeper.repository.TransactionRepository;
import com.keeper.service.TransactionService;
import com.keeper.dto.TransactionCreateDTO;
import com.keeper.dto.TransferCreateDTO;
import com.keeper.repository.AccountRepository;
import com.keeper.domain.Account;
import com.keeper.domain.enums.AccountClass;
import io.micronaut.http.annotation.*;
import jakarta.inject.Inject;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Controller("/api/v1/transactions")
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final TransactionService transactionService;
    private final AccountRepository accountRepository;
    private final com.keeper.repository.PayeeRepository payeeRepository;

    @Inject
    public TransactionController(TransactionRepository transactionRepository, TransactionService transactionService, AccountRepository accountRepository, com.keeper.repository.PayeeRepository payeeRepository) {
        this.transactionRepository = transactionRepository;
        this.transactionService = transactionService;
        this.accountRepository = accountRepository;
        this.payeeRepository = payeeRepository;
    }

    @Get("/{workspaceId}")
    public List<Transaction> list(@PathVariable UUID workspaceId, @QueryValue(defaultValue = "") String accountId) {
        // Return all transactions for workspace, filtering by account if provided
        // In reality we should join with LedgerEntry to filter by accountId
        return transactionRepository.findByWorkspaceId(workspaceId).stream()
            .filter(t -> accountId.isEmpty() || accountId.equals("ALL") || 
                         (t.getLedgerId() != null /* Needs proper joining to filter */))
            .collect(Collectors.toList());
    }

    @Post("/")
    public Transaction create(@Body TransactionCreateDTO dto) {
        UUID workspaceId = dto.workspace().id();
        UUID accountId = dto.account().id();
        String type = dto.type();
        
        UUID payeeId = null;
        if (dto.payee() != null) {
            if (dto.payee().id() != null) {
                payeeId = dto.payee().id();
            } else if (dto.payee().name() != null && !dto.payee().name().isBlank()) {
                com.keeper.domain.Payee newPayee = com.keeper.domain.Payee.builder()
                    .workspaceId(workspaceId)
                    .id(UUID.randomUUID())
                    .name(dto.payee().name())
                    .build();
                payeeId = payeeRepository.save(newPayee).getId();
            }
        }

        String otherAccountName = "Uncategorized";
        AccountClass otherAccountType = AccountClass.EXPENSE;
        
        if ("EXPENSE".equals(type) || "PAYMENT".equals(type)) {
            otherAccountName = dto.category() != null ? dto.category().name() : "Uncategorized Expense";
            otherAccountType = AccountClass.EXPENSE;
        } else if ("INCOME".equals(type)) {
            otherAccountName = dto.category() != null ? dto.category().name() : "Uncategorized Income";
            otherAccountType = AccountClass.INCOME;
        } else if ("LENDING".equals(type) || "INVESTMENT".equals(type)) {
            otherAccountName = dto.category() != null ? dto.category().name() : "Asset/Liability";
            otherAccountType = AccountClass.ASSET;
        }

        final String finalOtherAccountName = otherAccountName;
        final AccountClass finalOtherAccountType = otherAccountType;
        
        Account otherAccount = null;
        if (dto.category() != null && dto.category().id() != null) {
            otherAccount = accountRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, dto.category().id())).orElseThrow(() -> new IllegalArgumentException("Category not found"));
        } else {
            otherAccount = accountRepository.findByWorkspaceId(workspaceId).stream()
                    .filter(a -> finalOtherAccountName.equals(a.getName()))
                    .findFirst()
                    .orElseGet(() -> {
                        Account a = Account.builder()
                            .workspaceId(workspaceId)
                            .id(UUID.randomUUID())
                            .name(finalOtherAccountName)
                            .accountClass(finalOtherAccountType)
                            .nativeCurrency(dto.currency())
                            .build();
                        return accountRepository.save(a);
                    });
        }

        String idempotencyKey = UUID.randomUUID().toString();

        if ("EXPENSE".equals(type) || "PAYMENT".equals(type) || "LENDING".equals(type) || "INVESTMENT".equals(type)) {
            return transactionService.addExpense(
                workspaceId, 
                dto.date(), 
                accountId, // Asset Account
                otherAccount.getId(), // Category
                payeeId,
                dto.amount(), 
                dto.currency(), 
                dto.notes(), 
                idempotencyKey
            );
        } else if ("INCOME".equals(type)) {
            return transactionService.addIncome(
                workspaceId, 
                dto.date(), 
                accountId, // Asset Account
                otherAccount.getId(), // Category
                payeeId,
                dto.amount(), 
                dto.currency(), 
                dto.notes(), 
                idempotencyKey
            );
        } else {
            throw new IllegalArgumentException("Unsupported type: " + type);
        }
    }

    @Post("/{workspaceId}/transfer")
    public Transaction createTransfer(@PathVariable UUID workspaceId, @Body TransferCreateDTO dto) {
        return transactionService.addTransfer(
            workspaceId, 
            dto.date(), 
            dto.fromAccountId(), 
            dto.toAccountId(),
            dto.amount(), 
            dto.currency(), 
            dto.notes(),
            UUID.randomUUID().toString()
        );
    }

    @Put("/{workspaceId}/{id}")
    public Transaction update(@PathVariable UUID workspaceId, @PathVariable UUID id, @Body TransactionCreateDTO dto) {
        throw new UnsupportedOperationException("Updates are not supported yet in new Ledger architecture");
    }

    @Delete("/{workspaceId}/{id}")
    public void delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
        throw new UnsupportedOperationException("Deletions are not supported yet in new Ledger architecture");
    }
}

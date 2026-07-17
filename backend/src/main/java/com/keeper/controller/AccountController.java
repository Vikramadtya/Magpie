package com.keeper.controller;

import com.keeper.domain.Account;
import com.keeper.domain.enums.AccountClass;
import com.keeper.repository.AccountRepository;
import com.keeper.service.TransactionService;
import com.keeper.dto.AccountCreateDTO;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.*;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.exceptions.HttpStatusException;
import jakarta.inject.Inject;

import javax.money.Monetary;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Controller("/api/v1/accounts")
public class AccountController {

    private final AccountRepository accountRepository;
    private final TransactionService transactionService;
    private final com.keeper.repository.TransactionRepository transactionRepository;

    @Inject
    public AccountController(AccountRepository accountRepository, TransactionService transactionService, com.keeper.repository.TransactionRepository transactionRepository) {
        this.accountRepository = accountRepository;
        this.transactionService = transactionService;
        this.transactionRepository = transactionRepository;
    }

    @Get("/{workspaceId}")
    public List<Account> list(@PathVariable UUID workspaceId) {
        // Find all accounts except deleted
        return accountRepository.findByWorkspaceId(workspaceId).stream()
                .filter(a -> a.getDeletedAt() == null)
                .toList();
    }

    @Post("/{workspaceId}")
    public Account create(@PathVariable UUID workspaceId, @Body AccountCreateDTO dto) {
        Account account = Account.builder()
                .workspaceId(workspaceId)
                .id(UUID.randomUUID())
                .name(dto.name())
                .accountClass(dto.type())
                .nativeCurrency(dto.currency())
                .build();
        
        if (dto.parentId() != null) {
            accountRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, dto.parentId()))
                .ifPresent(p -> account.setParentId(p.getId()));
        }
        
        Account savedAccount = accountRepository.save(account);

        if (dto.initialBalance() != null && dto.initialBalance() != 0) {
            long amt = Math.abs(dto.initialBalance());
            // Equity account for opening balances
            Account equity = accountRepository.findByWorkspaceId(workspaceId).stream()
                .filter(a -> "Opening Balances".equals(a.getName()))
                .findFirst()
                .orElseGet(() -> {
                    Account eq = Account.builder()
                        .workspaceId(workspaceId)
                        .id(UUID.randomUUID())
                        .name("Opening Balances")
                        .accountClass(AccountClass.EQUITY)
                        .nativeCurrency(dto.currency())
                        .build();
                    return accountRepository.save(eq);
                });

            // Use transaction service to add the opening balance as a transfer
            transactionService.addTransfer(workspaceId, LocalDate.now(), equity.getId(), savedAccount.getId(), amt, dto.currency(), "Opening Balance", UUID.randomUUID().toString());
        }

        return savedAccount;
    }

    @Put("/{workspaceId}/{id}")
    public Account update(@PathVariable UUID workspaceId, @PathVariable UUID id, @Body Account accountUpdates) {
        return accountRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, id)).map(existing -> {
            if (accountUpdates.getName() != null) existing.setName(accountUpdates.getName());
            if (accountUpdates.getAccountClass() != null) existing.setAccountClass(accountUpdates.getAccountClass());
            if (accountUpdates.getNativeCurrency() != null) existing.setNativeCurrency(accountUpdates.getNativeCurrency());
            if (accountUpdates.getIsActive() != null) existing.setIsActive(accountUpdates.getIsActive());
            return accountRepository.update(existing);
        }).orElseThrow(() -> new HttpStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @Delete("/{workspaceId}/{id}")
    public HttpResponse<?> delete(@PathVariable UUID workspaceId, @PathVariable UUID id) {
        return accountRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, id)).map(account -> {
            boolean hasChildren = accountRepository.findByWorkspaceId(workspaceId).stream()
                .anyMatch(a -> id.equals(a.getParentId()));
                
            if (hasChildren) {
                return HttpResponse.badRequest("Cannot delete a category that has sub-categories. Please delete or reassign them first.");
            }
            
            // Check if account has transactions
            // Skip tx count check for now or implement properly with new Ledger
            account.setDeletedAt(java.time.Instant.now());
            accountRepository.update(account);
            return HttpResponse.noContent();
        }).orElse(HttpResponse.notFound());
    }
}

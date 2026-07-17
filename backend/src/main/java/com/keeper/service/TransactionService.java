package com.keeper.service;

import com.keeper.domain.*;
import com.keeper.domain.enums.*;
import com.keeper.repository.*;
import lombok.RequiredArgsConstructor;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Singleton
@RequiredArgsConstructor
public class TransactionService {

    private final LedgerRepository ledgerRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final TransactionRepository transactionRepository;
    private final AccountBalanceRepository accountBalanceRepository;
    
    private final CurrencyService currencyService;
    private final AccountRepository accountRepository;
    private final WorkspaceRepository workspaceRepository;
    
    @Transactional
    public Transaction addExpense(UUID workspaceId, LocalDate date, UUID assetAccountId, UUID categoryId, UUID payeeId, 
                                  Long amountMinor, String currency, String description, String idempotencyKey) {
        
        if (amountMinor <= 0) {
            throw new IllegalArgumentException("Amount must be strictly positive for Expense");
        }
        
        return postTransaction(workspaceId, date, assetAccountId, categoryId, payeeId, 
            amountMinor, currency, description, idempotencyKey, TransactionType.EXPENSE);
    }
    
    @Transactional
    public Transaction addIncome(UUID workspaceId, LocalDate date, UUID assetAccountId, UUID categoryId, UUID payeeId, 
                                 Long amountMinor, String currency, String description, String idempotencyKey) {
                                     
        if (amountMinor <= 0) {
            throw new IllegalArgumentException("Amount must be strictly positive for Income");
        }
        
        return postTransaction(workspaceId, date, assetAccountId, categoryId, payeeId, 
            amountMinor, currency, description, idempotencyKey, TransactionType.INCOME);
    }

    @Transactional
    public Transaction addTransfer(UUID workspaceId, LocalDate date, UUID fromAssetAccountId, UUID toAssetAccountId, 
                                   Long amountMinor, String currency, String description, String idempotencyKey) {
                                       
        if (amountMinor <= 0) {
            throw new IllegalArgumentException("Amount must be strictly positive for Transfer");
        }
        
        return postTransaction(workspaceId, date, fromAssetAccountId, toAssetAccountId, null, 
            amountMinor, currency, description, idempotencyKey, TransactionType.TRANSFER);
    }
    
    private Transaction postTransaction(UUID workspaceId, LocalDate date, UUID account1Id, UUID account2Id, UUID payeeId, 
                                        Long amountMinor, String currency, String description, String idempotencyKey, 
                                        TransactionType type) {
        
        // 0. Fetch References
        Account account1 = accountRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, account1Id))
            .orElseThrow(() -> new IllegalArgumentException("Account 1 not found"));
        Account account2 = accountRepository.findById(new com.keeper.domain.keys.WorkspaceIdKey(workspaceId, account2Id))
            .orElseThrow(() -> new IllegalArgumentException("Account 2 not found"));
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new IllegalArgumentException("Workspace not found"));

        String txCurrency = currency;
        String a1Currency = account1.getNativeCurrency() != null ? account1.getNativeCurrency() : txCurrency;
        String a2Currency = account2.getNativeCurrency() != null ? account2.getNativeCurrency() : txCurrency;
        String funcCurrency = workspace.getFunctionalCurrency() != null ? workspace.getFunctionalCurrency() : "USD";

        // 1. Create Ledger Header
        UUID ledgerId = UUID.randomUUID();
        Ledger ledger = Ledger.builder()
            .workspaceId(workspaceId)
            .id(ledgerId)
            .effectiveAt(date)
            .recordedAt(Instant.now())
            .idempotencyKey(idempotencyKey)
            .source(LedgerSource.USER)
            .build();
            
        ledgerRepository.save(ledger);
        
        // 2. Compute the Double Entry Math (Transaction Currency)
        long account1Amount = 0;
        long account2Amount = 0;
        
        if (type == TransactionType.EXPENSE) {
            account1Amount = -amountMinor; // Asset decreases (CREDIT)
            account2Amount = amountMinor;  // Expense category increases (DEBIT)
        } else if (type == TransactionType.INCOME) {
            account1Amount = amountMinor;  // Asset increases (DEBIT)
            account2Amount = -amountMinor; // Income category increases (CREDIT)
        } else if (type == TransactionType.TRANSFER) {
            account1Amount = -amountMinor; // From Asset decreases (CREDIT)
            account2Amount = amountMinor;  // To Asset increases (DEBIT)
        }
        
        if (account1Amount + account2Amount != 0) {
            throw new IllegalStateException("FATAL: Ledger entries do not balance to zero.");
        }

        // 3. Normalize to Native and Functional Currencies
        long a1NativeAmount = currencyService.convert(account1Amount, txCurrency, a1Currency, date);
        long a2NativeAmount = currencyService.convert(account2Amount, txCurrency, a2Currency, date);

        long a1FuncAmount = currencyService.convert(account1Amount, txCurrency, funcCurrency, date);
        long a2FuncAmount = currencyService.convert(account2Amount, txCurrency, funcCurrency, date);
        
        // 4. Post Ledger Entries
        LedgerEntry entry1 = LedgerEntry.builder()
            .workspaceId(workspaceId)
            .ledgerId(ledgerId)
            .lineNumber(1)
            .accountId(account1Id)
            .nativeCurrency(a1Currency)
            .nativeAmountMinor(a1NativeAmount)
            .functionalCurrency(funcCurrency)
            .functionalAmountMinor(a1FuncAmount)
            .build();
            
        LedgerEntry entry2 = LedgerEntry.builder()
            .workspaceId(workspaceId)
            .ledgerId(ledgerId)
            .lineNumber(2)
            .accountId(account2Id)
            .nativeCurrency(a2Currency)
            .nativeAmountMinor(a2NativeAmount)
            .functionalCurrency(funcCurrency)
            .functionalAmountMinor(a2FuncAmount)
            .build();
            
        ledgerEntryRepository.saveAll(List.of(entry1, entry2));
        
        // 5. Create UI Envelope (Fast Read Model)
        UUID txId = UUID.randomUUID();
        Transaction tx = Transaction.builder()
            .workspaceId(workspaceId)
            .id(txId)
            .ledgerId(ledgerId)
            .effectiveAt(date)
            .payeeId(payeeId)
            .description(description)
            .displayAmount(amountMinor)
            .displayCurrency(currency)
            .type(type)
            .subtype(TransactionSubtype.NORMAL)
            .createdAt(Instant.now())
            .build();
            
        transactionRepository.save(tx);
        
        // 6. Fire Account Balance Updates
        // Balance updates must be applied using the Normalized Native Amounts!
        updateBalance(workspaceId, account1Id, a1NativeAmount);
        updateBalance(workspaceId, account2Id, a2NativeAmount);
        
        return tx;
    }
    
    private void updateBalance(UUID workspaceId, UUID accountId, long amount) {
        accountBalanceRepository.incrementBalance(workspaceId, accountId, amount);
    }
}

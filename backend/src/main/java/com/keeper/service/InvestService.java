package com.keeper.service;

import com.keeper.domain.Transaction;
import com.keeper.domain.enums.AccountClass;
import com.keeper.domain.enums.AccountRole;
import com.keeper.domain.enums.NormalSide;
import lombok.RequiredArgsConstructor;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Singleton
@RequiredArgsConstructor
public class InvestService {

    private final TransactionService transactionService;
    // private final AccountService accountService;

    @Transactional
    public UUID createInvestmentAccount(UUID workspaceId, String name, String currency) {
        // In a real implementation, this would call accountService.createAccount(...)
        // Account is created as ASSET, role BANK or a specialized INVEST role.
        return UUID.randomUUID(); // Placeholder
    }

    @Transactional
    public Transaction buyAsset(UUID workspaceId, LocalDate date, UUID cashAccountId, UUID investmentAccountId, 
                                Long amountMinor, String currency, String assetTicker) {
        
        // Buying an asset is just a transfer of value from a cash account to an investment account.
        // It maintains the SUM=0 double entry rule.
        String desc = "Bought asset: " + assetTicker;
        return transactionService.addTransfer(workspaceId, date, cashAccountId, investmentAccountId, 
                                              amountMinor, currency, desc, UUID.randomUUID().toString());
    }
    
    @Transactional
    public Transaction sellAsset(UUID workspaceId, LocalDate date, UUID investmentAccountId, UUID cashAccountId, 
                                 Long amountMinor, String currency, String assetTicker) {
        
        String desc = "Sold asset: " + assetTicker;
        return transactionService.addTransfer(workspaceId, date, investmentAccountId, cashAccountId, 
                                              amountMinor, currency, desc, UUID.randomUUID().toString());
    }
}

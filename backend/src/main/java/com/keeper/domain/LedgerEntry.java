package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "ledger_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.LedgerEntryKey.class)
public class LedgerEntry {
    @Id
    private UUID workspaceId;
    @Id
    private UUID ledgerId;
    @Id
    private Integer lineNumber;
    private UUID accountId;
    private String nativeCurrency;
    private Long nativeAmountMinor;
    private String functionalCurrency;
    private Long functionalAmountMinor;
    private UUID fxQuoteId;
}

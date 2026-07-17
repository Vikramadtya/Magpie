package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "account_balances")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.AccountBalanceKey.class)
public class AccountBalance {
    @Id
    private UUID workspaceId;
    @Id
    private UUID accountId;
    private Long nativeBalance;
    private Long functionalBalance;
    private java.time.Instant lastUpdatedAt;
}

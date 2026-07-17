package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "budgets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.WorkspaceIdKey.class)
public class Budget {
    @Id
    private UUID workspaceId;
    @Id
    private UUID id;
    private UUID accountId;
    private String name;
    private Long amountLimit;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.BudgetPeriod period;
    private Boolean isActive;
    private java.time.Instant createdAt;
}

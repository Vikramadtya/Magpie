package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.WorkspaceIdKey.class)
public class Transaction {
    @Id
    private UUID workspaceId;
    @Id
    private UUID id;
    private UUID ledgerId;
    private java.time.LocalDate effectiveAt;
    private UUID payeeId;
    private String description;
    private Long displayAmount;
    private String displayCurrency;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.TransactionType type;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.TransactionSubtype subtype;
    private java.time.Instant createdAt;
}

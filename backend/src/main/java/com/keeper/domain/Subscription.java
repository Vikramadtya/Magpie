package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.WorkspaceIdKey.class)
public class Subscription {
    @Id
    private UUID workspaceId;
    @Id
    private UUID id;
    private UUID accountId;
    private UUID categoryId;
    private UUID payeeId;
    private String name;
    private Long amount;
    private String currency;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.BillingCycle billingCycle;
    private java.time.LocalDate nextBillingDate;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.SubscriptionStatus status;
    private java.time.Instant createdAt;
    private java.time.Instant deletedAt;
}

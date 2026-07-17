package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "ledgers")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.WorkspaceIdKey.class)
public class Ledger {
    @Id
    private UUID workspaceId;
    @Id
    private UUID id;
    private java.time.LocalDate effectiveAt;
    private java.time.Instant recordedAt;
    private UUID reversalOfId;
    private String idempotencyKey;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.LedgerSource source;
}

package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "payees")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.WorkspaceIdKey.class)
public class Payee {
    @Id
    private UUID workspaceId;
    @Id
    private UUID id;
    private String name;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.PayeeType type;
    private java.time.Instant createdAt;
}

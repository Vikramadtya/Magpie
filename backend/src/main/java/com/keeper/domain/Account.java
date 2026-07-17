package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "accounts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.WorkspaceIdKey.class)
public class Account {
    @Id
    private UUID workspaceId;
    @Id
    private UUID id;
    private UUID parentId;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.AccountClass accountClass;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.NormalSide normalSide;
    @Enumerated(jakarta.persistence.EnumType.STRING)
    private com.keeper.domain.enums.AccountRole accountRole;
    private String nativeCurrency;
    private String path;
    private String name;
    private Boolean isActive;
    private java.time.Instant createdAt;
    private java.time.Instant deletedAt;
}

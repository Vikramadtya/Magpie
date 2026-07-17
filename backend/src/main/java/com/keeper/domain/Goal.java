package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "goals")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@IdClass(com.keeper.domain.keys.WorkspaceIdKey.class)
public class Goal {
    @Id
    private UUID workspaceId;
    @Id
    private UUID id;
    private String name;
    private Long targetAmount;
    private Long savedAmount;
    private String targetCurrency;
    private java.time.LocalDate dueDate;
    private Integer priority;
    private java.time.Instant createdAt;
    private java.time.Instant deletedAt;
}

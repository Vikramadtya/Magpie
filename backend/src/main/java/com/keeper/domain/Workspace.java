package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "workspaces")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class Workspace {
    @Id
    private UUID id;
    private UUID userId;
    private String name;
    private String functionalCurrency;
    private java.time.Instant createdAt;
    private java.time.Instant deletedAt;
}

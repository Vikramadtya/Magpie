package com.keeper.workspace;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "workspaces")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@io.micronaut.serde.annotation.Serdeable
public class Workspace {
  @Id private UUID id;
  private UUID userId;
  private String name;
  private String functionalCurrency;
  private java.time.Instant createdAt;
  private java.time.Instant deletedAt;

  @PrePersist
  public void prePersist() {
    if (createdAt == null) {
      createdAt = java.time.Instant.now();
    }
  }
}

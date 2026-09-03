package com.keeper.auth;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@io.micronaut.serde.annotation.Serdeable
public class User {
  @Id private UUID id;
  private String email;
  private String passwordHash;
  private String name;
  private String googleId;
  private java.time.Instant createdAt;
  private java.time.Instant deletedAt;

  @PrePersist
  public void prePersist() {
    if (createdAt == null) {
      createdAt = java.time.Instant.now();
    }
  }
}

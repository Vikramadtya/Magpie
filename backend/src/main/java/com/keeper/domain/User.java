package com.keeper.domain;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor

public class User {
    @Id
    private UUID id;
    private String email;
    private String passwordHash;
    private String name;
    private String googleId;
    private java.time.Instant createdAt;
    private java.time.Instant deletedAt;
}

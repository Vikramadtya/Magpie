# Persistence Architecture

This document describes how data is handled and stored in Keeper using Micronaut Data JPA and PostgreSQL.

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    WORKSPACE ||--o{ ACCOUNT : owns
    WORKSPACE ||--o{ BUDGET : owns
    WORKSPACE ||--o{ CATEGORY : owns
    WORKSPACE ||--o{ GOAL : owns
    WORKSPACE ||--o{ PAYEE : owns
    WORKSPACE ||--o{ SUBSCRIPTION : owns
    WORKSPACE ||--o{ TRANSACTION : owns
    
    ACCOUNT ||--o{ TRANSACTION : tracks
    CATEGORY ||--o{ TRANSACTION : categorizes
    PAYEE ||--o{ TRANSACTION : involves
    
    WORKSPACE {
        UUID id PK
        String name
    }
    
    ACCOUNT {
        UUID id PK
        String name
        String type
        BigDecimal balance
    }
    
    TRANSACTION {
        UUID id PK
        BigDecimal amount
        String type
        LocalDate date
    }
```

## Data Flow

When a request is received, it follows this strict Domain-Driven flow:

```mermaid
sequenceDiagram
    participant C as Controller
    participant S as ServiceImpl
    participant M as EntityMapper
    participant R as Repository
    participant DB as PostgreSQL
    
    C->>S: Calls createTransaction(dto)
    S->>M: toEntity(dto)
    M-->>S: TransactionEntity
    S->>R: save(TransactionEntity)
    R->>DB: INSERT ...
    DB-->>R: Result
    R-->>S: SavedEntity
    S->>M: toDto(SavedEntity)
    M-->>S: TransactionDTO
    S-->>C: return TransactionDTO
```

## Data Models
1. **Entities**: Annotated with `@Entity`, representing DB tables. Handled by Hibernate.
2. **DTOs**: Generated from OpenAPI specs, used for API contracts.
3. **Mappers**: `MapStruct` automatically converts Entities to DTOs for fast, reflection-free mapping.

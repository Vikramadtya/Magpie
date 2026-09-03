# Authorisation Architecture

Keeper utilizes stateless JWT (JSON Web Tokens) combined with Micronaut Security for robust, highly-scalable authentication.

## Security Flow

```mermaid
sequenceDiagram
    actor User
    participant App as Frontend (React)
    participant Auth as AuthController
    participant Google as Google OAuth2
    participant JWT as Micronaut Security
    
    User->>App: Clicks "Login with Google"
    App->>Google: Authenticates
    Google-->>App: Returns OAuth Token
    App->>Auth: POST /auth/google {token}
    Auth->>Google: Validates Token Signature
    Auth->>Auth: Finds/Creates User Account
    Auth->>JWT: Generates JWT Access & Refresh Tokens
    JWT-->>App: Returns {accessToken, refreshToken}
    
    Note over User, JWT: Subsequent API Requests
    App->>Auth: GET /api/transactions (Header: Bearer {accessToken})
    JWT->>JWT: Validates Signature & Expiry
    JWT-->>Auth: Injects Authenticated User Context
    Auth-->>App: Returns 200 OK (Data)
```

## Implementation Details
- **Token Storage**: The client stores the JWT (preferably in `HttpOnly` cookies for maximum XSS protection, or memory/local storage).
- **Workspace Isolation**: Every user owns a `Workspace`. Every API request inherently includes the `Workspace ID` which the `SecurityRule` checks against the authenticated user's allowed workspaces to prevent Broken Object Level Authorization (BOLA).
- **Configuration**: Managed in `application.yml` under `micronaut.security`.

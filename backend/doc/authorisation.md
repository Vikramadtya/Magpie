# Authorisation Architecture

## Tokens
- **Access token**: JWT, 15 minutes, kept **in memory** by the SPA and sent as `Authorization: Bearer`.
- **Refresh token**: random 256-bit value in an `HttpOnly; SameSite=Lax` cookie scoped to `/api/v1/auth`. Stored only as a SHA-256 hash, **single use** and rotated on every refresh. Reusing an old token revokes the whole token family (theft detection).
- Google sign-in sets the same refresh cookie and redirects to `/auth/callback`; no token is ever placed in a URL.

## Tenant isolation
Every `/api/v1/workspaces/{id}/...` request passes `WorkspaceAccessFilter`, the single choke point:

| Caller | Result |
|---|---|
| Not a member | `404` (ids cannot be probed) |
| `VIEWER` | read (`GET`) only |
| `EDITOR` | read + write data |
| `OWNER` | also members, invites, rename/delete workspace |

Membership is cached for 30 s and evicted when roles change. As a second layer, every repository query is scoped by `workspace_id`, and `RefChecks` rejects references (account, category, payee, tag) that belong to another workspace.

## Other protections
Bean validation on every request body, per-IP rate limits (auth 10/min, writes 240/min), security headers on all responses, RFC 7807 errors without stack traces, idempotency keys on create endpoints, optimistic locking (`version`) on transactions.

# Keeper — Implementation Plan

> Status: **draft for approval** · Scope: Web (PWA) · Multi-user: shared workspaces with roles · Ledger: simple single-row transactions

## 0. Where we are today

| Area | State |
|---|---|
| Backend (Micronaut 4.7, Java 21) | Controllers, services and repositories exist, but every service is a **stub returning hardcoded data**. `TransactionRepository` is typed to `Workspace`. No real persistence beyond `users`/`workspaces`. |
| Schema (`V1__init_enterprise_ledger.sql`) | Full double-entry ledger (ltree, FX quotes, composite keys, shared spaces). **Too complex for the chosen direction**, and nothing in code uses it. |
| Security | Google OAuth works. JWT is passed **in the URL fragment** and stored in `localStorage`. `workspaceId` is a path param that is **never checked** against the caller (BOLA hole). Wildcard CORS methods/headers. |
| Frontend (React 19, Vite, TanStack Query, Tailwind) | All pages are built, using an MVVM `features/*/{api,hooks,components}` layout, but they run against `mockApi.ts`. Some hooks read `workspaceId` straight from `localStorage`. |
| Contract | `keeper-api.yaml` is used for codegen. Backend uses the *client* generator (`java-micronaut-client`), which is wrong for controllers. |
| Tests | No backend tests. A few frontend view-model tests. |

**Strategy:** keep the stack and the frontend structure. Rebuild the backend domain on a simple schema, contract-first, then wire each page to the real API one feature at a time.

---

## 1. Architecture principles

**Backend layers, one package per feature** (`com.keeper.<feature>`):

```
Controller  ── HTTP only: implements the generated *Api interface, validation, maps to DTO
   │
Service     ── interface + impl; business rules, transactions (@Transactional)
   │
Repository  ── Micronaut Data JDBC; compile-time queries, every query scoped by workspace_id
```

- **Micronaut Data JDBC, not JPA/Hibernate.** It is faster to start (important for Render cold starts), uses no reflection, and has no lazy-loading surprises. SQL stays explicit.
- **Contract-first.** `keeper-api.yaml` is the single source of truth. It generates Java server interfaces (`java-micronaut-server`, `interfaceOnly=true`) and the TS axios client. No hand-written DTOs on either side.
- **Money** is always a `long` in minor units plus an ISO currency code. It is never a float or a `BigDecimal` on the wire. Formatting happens only in the UI.
- **SOLID in practice:**
  - *S*: controllers don't hold logic; services don't know HTTP.
  - *O / Strategy*: `RecurrenceCalculator` (weekly, monthly, …), `CsvImportStrategy` per bank format, `FxRateProvider`.
  - *L / I*: small service interfaces per feature, so there's no god "FinanceService".
  - *D*: services depend on repository interfaces and `Clock`, which makes them testable.
- **Other patterns:**
  - *Observer*: `TransactionChangedEvent` via `ApplicationEventPublisher` invalidates caches and writes the audit log.
  - *Specification*: transaction filters are built as composable criteria.
  - *Template method*: the import pipeline (parse → normalize → dedupe → preview → commit).
  - *Factory*: building transfer pairs.

**Frontend:**
- The existing MVVM layout stays: `features/<x>/api` (thin wrappers on the generated client), `hooks/use<X>` (TanStack Query), `hooks/use<X>ViewModel` (UI state), and `components`.
- One `useWorkspace()` context replaces the scattered `localStorage.getItem('workspaceId')` calls.
- `mockApi.ts` is kept only for Storybook and tests, behind the flag, and never in prod builds.

---

## 2. Data model (fresh `V1__init.sql`, replaces V1 and V2)

> ⚠️ This drops the current migrations. It is safe only if Neon holds no data you need. Confirm before Phase 0 lands.

```sql
-- identity & tenancy
users(id, email UNIQUE, name, password_hash NULL, google_id UNIQUE NULL, created_at)
refresh_tokens(id, user_id, token_hash UNIQUE, family_id, expires_at, revoked_at)
workspaces(id, name, base_currency, created_by, created_at)
workspace_members(workspace_id, user_id, role CHECK (OWNER|EDITOR|VIEWER), joined_at, PK(workspace_id,user_id))
workspace_invites(id, workspace_id, email, role, token_hash UNIQUE, expires_at, accepted_at, created_by)

-- money tracking
accounts(id, workspace_id, name, type CHECK (CHECKING|SAVINGS|CREDIT_CARD|CASH|LOAN|INVESTMENT|OTHER),
         currency, opening_balance_minor, balance_minor, is_archived, sort_order, version, created_at)
categories(id, workspace_id, parent_id NULL, name, kind CHECK (INCOME|EXPENSE), icon, color, is_archived)
payees(id, workspace_id, name, default_category_id NULL, UNIQUE(workspace_id, lower(name)))
tags(id, workspace_id, name, color, UNIQUE(workspace_id, lower(name)))

transactions(
  id, workspace_id, account_id, type CHECK (INCOME|EXPENSE|TRANSFER),
  amount_minor BIGINT CHECK (amount_minor > 0), currency, occurred_on DATE,
  category_id NULL, payee_id NULL, note,
  transfer_id NULL,          -- both legs of a transfer share this id
  recurring_rule_id NULL, import_hash NULL, idempotency_key NULL,
  created_by, updated_by, version, created_at, updated_at, deleted_at NULL)
transaction_tags(transaction_id, tag_id)
transaction_comments(id, workspace_id, transaction_id, user_id, body, created_at)

-- planning
budgets(id, workspace_id, category_id, month DATE, amount_minor, rollover BOOL, UNIQUE(workspace_id,category_id,month))
goals(id, workspace_id, name, target_minor, currency, target_date NULL, linked_account_id NULL, archived_at)
goal_contributions(id, goal_id, amount_minor, occurred_on, transaction_id NULL)
recurring_rules(id, workspace_id, name, template JSONB, frequency CHECK (DAILY|WEEKLY|MONTHLY|QUARTERLY|YEARLY),
                interval INT, next_run_on DATE, end_on NULL, auto_post BOOL, status CHECK (ACTIVE|PAUSED))

-- insights
exchange_rates(base, quote, rate NUMERIC(20,10), as_of DATE, PK(base,quote,as_of))
import_batches(id, workspace_id, account_id, file_name, row_count, status, created_by, created_at)

-- investments
holdings(id, workspace_id, account_id, symbol, name, quantity NUMERIC(24,8), cost_basis_minor, currency)
prices(symbol, price_minor, currency, as_of, PK(symbol, as_of))

-- audit
audit_log(id, workspace_id, user_id, entity, entity_id, action, diff JSONB, at)
```

**How the simple ledger works**
- One row is one transaction. A transfer is **two rows** sharing a `transfer_id`: an EXPENSE leg on the source account and an INCOME leg on the destination, created and deleted together by `TransferFactory`.
- The `accounts.balance_minor` cache is updated in the **same DB transaction** with an atomic `UPDATE accounts SET balance_minor = balance_minor + :delta`. Reads are O(1). The admin endpoint `POST /accounts/{id}/recalculate` recomputes the cache from transaction rows if it ever drifts.
- Deletes are soft (`deleted_at`). Every write records an `audit_log` row, so a shared workspace shows who changed what.
- `version` gives optimistic locking. If two members edit the same transaction, the second gets `409 Conflict` and the UI refreshes that row.

**Indexes for speed:**
- `transactions(workspace_id, occurred_on DESC, id DESC) WHERE deleted_at IS NULL` for the main list with keyset pagination
- `transactions(workspace_id, category_id, occurred_on)` for budgets and analytics
- `transactions(workspace_id, account_id, occurred_on)`
- a partial unique index on `(workspace_id, idempotency_key)` and on `(account_id, import_hash)`
- a trigram GIN index on `note` and on payee `name` for search

---

## 3. Security design

| Concern | Design |
|---|---|
| Sign-in | Google OAuth (existing), plus email/password (bcrypt, cost 12) |
| Tokens | Access JWT valid for **15 min**, kept **in memory only**. Refresh token valid for 30 days in an **HttpOnly; Secure; SameSite=Lax** cookie, rotated on every use, stored hashed, with family-wide revocation if a reused token is detected. The token is no longer put in the URL fragment. |
| Same-origin API | A Vercel rewrite `/api/* → Render` makes cookies first-party, so no `SameSite=None` is needed and CORS can be locked to a single origin. |
| Tenant isolation | Routes are `/api/v1/workspaces/{workspaceId}/…`. A `WorkspaceAccessFilter` resolves membership (Caffeine cache, 60 s, evicted on role change) and enforces **VIEWER = read, EDITOR = write, OWNER = members/settings/delete**. Every repository method also takes `workspaceId`, so isolation is enforced twice. |
| Input | Jakarta Validation on every DTO; amount, string-length and date bounds; CSV upload ≤ 5 MB / 10k rows. Server-side checks that the category, account and payee belong to the same workspace. |
| Abuse | Rate limits: login and refresh at 10/min/IP, writes at 120/min/user. Idempotency keys on create endpoints. |
| Headers | HSTS, CSP (self + Google), `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`. CORS limited to explicit methods and headers. |
| Errors and logging | RFC 7807 problem responses with no stack traces; correlation id (existing filter); no tokens or PII in logs (the current debug log of the access token is removed). |
| Tests | Integration tests prove that user B gets a **404** on every route of user A's workspace. |

---

## 4. Performance and UX design

- **API:** a single dashboard endpoint (one round trip), keyset pagination (no `OFFSET`), SQL `GROUP BY date_trunc` aggregates, HikariCP tuned for Neon, gzip, and `ETag` on reference data (categories, accounts, payees).
- **Cold start:** Micronaut AOT is enabled and JDBC replaces Hibernate. The existing wake-up toast stays. GraalVM native image is a stretch goal.
- **Frontend:**
  - *Optimistic updates* for create, edit and delete of transactions, so the UI reacts in under 16 ms and rolls back on error.
  - The query cache is persisted to IndexedDB, so a reload paints instantly from cache and then revalidates.
  - Next pages are prefetched on scroll, and routes on hover.
  - Long lists are virtualized (`react-virtuoso`, already a dependency).
  - **Quick add:** a `⌘K` command palette (`cmdk`, already a dependency) and an `N` shortcut. The form remembers the last account, and the payee fills in its default category.
  - Bundle budget is under 200 KB gzipped for the initial route. Unused dependencies (`million`, `emoji-picker-react` if unused, `@dnd-kit` if unused) are dropped and `framer-motion` is lazy-loaded.
  - PWA: the app shell and the last-synced data are readable offline. Writes made offline are queued (stretch goal).

---

## 5. API surface (v1)

All routes below are prefixed `/api/v1/workspaces/{ws}` unless marked.

```
Auth (no prefix)  POST /api/v1/auth/register | /login | /refresh | /logout   GET /api/v1/me
Workspaces        GET/POST /api/v1/workspaces   PATCH/DELETE /{ws}
Members           GET /members  PATCH/DELETE /members/{userId}  POST /invites  POST /api/v1/invites/{token}/accept
Accounts          CRUD /accounts   POST /accounts/{id}/recalculate
Categories        CRUD /categories (tree)      Payees CRUD /payees      Tags CRUD /tags
Transactions      GET /transactions?cursor&limit&from&to&accountId&categoryId&payeeId&tagId&type&q
                  POST /transactions  POST /transfers  PATCH/DELETE /transactions/{id}
                  POST /transactions/bulk (recategorize/delete)
Comments          GET/POST /transactions/{id}/comments
Budgets           GET /budgets?month=YYYY-MM (with spent/remaining)  PUT /budgets/{categoryId}/{month}  POST /budgets/copy-previous
Goals             CRUD /goals  POST /goals/{id}/contributions
Recurring         CRUD /recurring  POST /recurring/{id}/post-now   GET /recurring/upcoming?days=30
Dashboard         GET /dashboard?month=
Analytics         GET /analytics/spending-by-category | /cash-flow | /net-worth | /top-payees  (?from&to)
Import/Export     POST /imports (multipart → preview)  POST /imports/{id}/commit  GET /export/transactions.csv
Investments       CRUD /holdings  PUT /prices/{symbol}   GET /investments/summary
Activity          GET /activity (audit feed)
```

---

## 6. Delivery phases

Each phase finishes end to end: migration, contract, backend, tests, frontend wired to the real API, and the mock path removed for that feature.

### Phase 0: Foundations
1. Replace the migrations with the new `V1__init.sql`. Switch to `micronaut-data-jdbc` and remove Hibernate.
2. Switch the OpenAPI generator to `java-micronaut-server` (interface-only) and rewrite `keeper-api.yaml` for the v1 surface.
3. Auth: register, login, refresh rotation and logout; fix the OAuth handler so it sets the refresh cookie instead of a URL token. Remove the token debug log.
4. `WorkspaceAccessFilter`, the membership cache, `CurrentUser` and `WorkspaceContext` beans, and the RFC 7807 exception handler.
5. Test harness: Testcontainers Postgres base class and a reusable "foreign workspace returns 404" test.
6. Frontend: in-memory token with a silent-refresh interceptor, `WorkspaceProvider`, and a regenerated API client.

### Phase 1: Core money tracking
- Accounts with a live balance cache, categories (two-level tree, seeded defaults on workspace creation), payees, tags
- Transactions: CRUD, transfers, filters and search, keyset pagination, idempotency, bulk actions, optimistic UI
- Dashboard: net worth, this month's income, expense and savings rate, recent transactions, account balances, budget health
- Command palette quick-add

### Phase 2: Multi-user
- Create and switch workspaces; invite by link (no email service needed; copy link), accept, change role, remove, leave
- Role-aware UI: viewers see no edit controls
- Transaction comments (the sidebar already exists) and an activity feed from `audit_log`

### Phase 3: Planning
- Monthly category budgets with rollover, copy last month, and progress bars (spent computed in one grouped query)
- Goals with contributions and projected completion date
- Recurring rules: a daily `@Scheduled` job posts due items. It is idempotent (key `rule:{id}:{date}`) and uses the `RecurrenceCalculator` strategy. An "Upcoming bills" widget shows what's due.

### Phase 4: Insights and data
- Analytics: spending by category (donut and trend), cash flow per month, net worth over time, top payees
- CSV import: column mapping, preview, duplicate detection via `import_hash`, then commit as a batch (undo by batch). CSV export is streamed.
- Multi-currency: per-account currency, with a daily FX job (ECB rates via frankfurter.app) converting to the workspace base currency in reports

### Phase 5: Investments
- Holdings on INVESTMENT accounts, manual price updates, market value, unrealized gain/loss and allocation chart

### Phase 6: Hardening and release
- Rate limiting, security headers and a CSP audit; dependency scanning in CI
- Performance pass: Lighthouse ≥ 95, bundle budget, slow-query check (`EXPLAIN` on the hot queries)
- Playwright smoke e2e (sign in → add account → add transaction → budget reflects it)
- Update `DEPLOYMENT.md` (Vercel rewrite, new env vars) and clean the stale `Makefile` targets and the Expo note in `AGENTS.md`

---

## 7. Testing strategy

| Layer | Tooling | Must cover |
|---|---|---|
| Domain and services | JUnit 5 + Mockito | Balance deltas on create/edit/delete/transfer, recurrence dates (month-end, leap years), budget rollover, CSV dedupe |
| API integration | `@MicronautTest` + Testcontainers Postgres | Auth flows, role matrix (viewer/editor/owner), cross-workspace 404, optimistic-lock 409, idempotent POST |
| Frontend | Vitest + Testing Library | View models, money formatting, optimistic rollback |
| E2E | Playwright | Golden path smoke test |

CI (existing workflow) adds the backend Testcontainers run, `vitest run` and an e2e job.

---

## 8. Out of scope (for now)
Bank sync (Plaid and similar), receipt attachments (need object storage), push or email notifications, the Splitwise-style shared spaces from the old schema, and the native mobile app.

## 9. Open questions
1. **Existing data:** is there anything in the Neon database worth keeping? If not, we reset migrations.
2. **Email/password login:** add it next to Google, or keep Google-only? (The plan assumes both.)
3. **Default currency** for new workspaces: USD, or INR?

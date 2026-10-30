# Persistence Architecture

PostgreSQL + Flyway (`src/main/resources/db/migration`), accessed with plain SQL through `com.keeper.common.db.Db` (Micronaut Data connection/transaction management, no ORM).

## Layers (per feature package)
`Controller` (HTTP, validation) -> `Service` (rules, transactions) -> `Repository` (SQL, always scoped by `workspace_id`).

## Money
Integers in minor units plus an ISO currency code. Reports convert to the workspace base currency via `FxConverter` using daily rates (`FxRateJob`).

## Ledger
One row per transaction. A transfer is two rows sharing `transfer_id`. `accounts.balance_minor` is a cache updated atomically (`balance = balance + delta`) in the same DB transaction as the change; `POST .../accounts/{id}/recalculate` rebuilds it from the rows. Deletes are soft (`deleted_at`).

## Lists
Keyset pagination on `(occurred_on DESC, id DESC)`; filters compose through `SqlWhere`. Trigram indexes serve note/payee search.

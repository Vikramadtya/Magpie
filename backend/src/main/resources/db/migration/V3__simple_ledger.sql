-- Replaces the enterprise ledger with a simple workspace/transaction model.
-- users (and existing workspaces, as OWNER memberships) are preserved.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DROP TABLE IF EXISTS
    private_space_links, shared_settlements, shared_ledger_entries, shared_ledger,
    shared_personas, shared_spaces, subscriptions, goals, budgets, attachments, comments,
    transaction_tags, transaction_categories, transactions, tags, payees,
    ledger_entries, ledger, account_balances, accounts, fx_quotes, exchange_rates,
    user_settings, currencies
    CASCADE;

-- ---------- identity & tenancy ----------
ALTER TABLE workspaces DROP COLUMN deleted_at;
ALTER TABLE workspaces RENAME COLUMN user_id TO created_by;
ALTER TABLE workspaces RENAME COLUMN functional_currency TO base_currency;
ALTER TABLE workspaces ALTER COLUMN base_currency TYPE CHAR(3);

CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         VARCHAR(10) NOT NULL CHECK (role IN ('OWNER','EDITOR','VIEWER')),
    joined_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX idx_members_user ON workspace_members(user_id);
INSERT INTO workspace_members(workspace_id, user_id, role)
SELECT id, created_by, 'OWNER' FROM workspaces;

CREATE TABLE workspace_invites (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    role         VARCHAR(10) NOT NULL CHECK (role IN ('EDITOR','VIEWER')),
    token_hash   TEXT NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ NOT NULL,
    accepted_at  TIMESTAMPTZ,
    created_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id  UUID NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX idx_refresh_family ON refresh_tokens(family_id);

-- ---------- money tracking ----------
CREATE TABLE accounts (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                  VARCHAR(120) NOT NULL,
    type                  VARCHAR(20) NOT NULL CHECK (type IN
        ('CHECKING','SAVINGS','CREDIT_CARD','CASH','LOAN','INVESTMENT','OTHER')),
    currency              CHAR(3) NOT NULL,
    opening_balance_minor BIGINT NOT NULL DEFAULT 0,
    balance_minor         BIGINT NOT NULL DEFAULT 0,
    is_archived           BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order            INT NOT NULL DEFAULT 0,
    version               INT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_accounts_ws ON accounts(workspace_id) WHERE NOT is_archived;

CREATE TABLE categories (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    parent_id    UUID REFERENCES categories(id) ON DELETE SET NULL,
    name         VARCHAR(120) NOT NULL,
    kind         VARCHAR(10) NOT NULL CHECK (kind IN ('INCOME','EXPENSE')),
    icon         VARCHAR(16),
    color        VARCHAR(7),
    is_archived  BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_categories_ws ON categories(workspace_id);

CREATE TABLE payees (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name                VARCHAR(160) NOT NULL,
    default_category_id UUID REFERENCES categories(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX uq_payees_name ON payees(workspace_id, lower(name));
CREATE INDEX idx_payees_trgm ON payees USING GIN (name gin_trgm_ops);

CREATE TABLE tags (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(60) NOT NULL,
    color        VARCHAR(7)
);
CREATE UNIQUE INDEX uq_tags_name ON tags(workspace_id, lower(name));

CREATE TABLE transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    account_id       UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    type             VARCHAR(10) NOT NULL CHECK (type IN ('INCOME','EXPENSE','TRANSFER')),
    amount_minor     BIGINT NOT NULL CHECK (amount_minor > 0),
    currency         CHAR(3) NOT NULL,
    occurred_on      DATE NOT NULL,
    category_id      UUID REFERENCES categories(id) ON DELETE SET NULL,
    payee_id         UUID REFERENCES payees(id) ON DELETE SET NULL,
    note             TEXT,
    transfer_id      UUID,
    recurring_rule_id UUID,
    import_hash      TEXT,
    idempotency_key  TEXT,
    created_by       UUID NOT NULL REFERENCES users(id),
    updated_by       UUID NOT NULL REFERENCES users(id),
    version          INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ
);
-- TRANSFER rows are two legs; direction is carried by sign_hint
ALTER TABLE transactions ADD COLUMN direction SMALLINT NOT NULL DEFAULT -1 CHECK (direction IN (-1, 1));

CREATE INDEX idx_tx_list ON transactions(workspace_id, occurred_on DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tx_category ON transactions(workspace_id, category_id, occurred_on) WHERE deleted_at IS NULL;
CREATE INDEX idx_tx_account ON transactions(workspace_id, account_id, occurred_on) WHERE deleted_at IS NULL;
CREATE INDEX idx_tx_transfer ON transactions(transfer_id) WHERE transfer_id IS NOT NULL;
CREATE UNIQUE INDEX uq_tx_idem ON transactions(workspace_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX uq_tx_import ON transactions(account_id, import_hash) WHERE import_hash IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_tx_note_trgm ON transactions USING GIN (note gin_trgm_ops);

CREATE TABLE transaction_tags (
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    tag_id         UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE transaction_comments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id),
    body           TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_comments_tx ON transaction_comments(transaction_id, created_at);

-- ---------- planning ----------
CREATE TABLE budgets (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    category_id  UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    month        DATE NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
    amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
    rollover     BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (workspace_id, category_id, month)
);

CREATE TABLE goals (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name              VARCHAR(160) NOT NULL,
    target_minor      BIGINT NOT NULL CHECK (target_minor > 0),
    currency          CHAR(3) NOT NULL,
    target_date       DATE,
    archived_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_goals_ws ON goals(workspace_id);

CREATE TABLE goal_contributions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id      UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount_minor BIGINT NOT NULL CHECK (amount_minor != 0),
    occurred_on  DATE NOT NULL
);
CREATE INDEX idx_goal_contrib ON goal_contributions(goal_id);

CREATE TABLE recurring_rules (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(160) NOT NULL,
    account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    category_id  UUID REFERENCES categories(id) ON DELETE SET NULL,
    payee_id     UUID REFERENCES payees(id) ON DELETE SET NULL,
    type         VARCHAR(10) NOT NULL CHECK (type IN ('INCOME','EXPENSE')),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency     CHAR(3) NOT NULL,
    frequency    VARCHAR(10) NOT NULL CHECK (frequency IN ('DAILY','WEEKLY','MONTHLY','QUARTERLY','YEARLY')),
    interval_n   INT NOT NULL DEFAULT 1 CHECK (interval_n > 0),
    anchor_day   SMALLINT NOT NULL CHECK (anchor_day BETWEEN 1 AND 31),
    next_run_on  DATE NOT NULL,
    end_on       DATE,
    auto_post    BOOLEAN NOT NULL DEFAULT TRUE,
    status       VARCHAR(10) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED')),
    created_by   UUID NOT NULL REFERENCES users(id)
);
CREATE INDEX idx_recurring_due ON recurring_rules(next_run_on) WHERE status = 'ACTIVE';

-- ---------- insights ----------
CREATE TABLE exchange_rates (
    base  CHAR(3) NOT NULL,
    quote CHAR(3) NOT NULL,
    rate  NUMERIC(20,10) NOT NULL CHECK (rate > 0),
    as_of DATE NOT NULL,
    PRIMARY KEY (base, quote, as_of)
);

CREATE TABLE import_batches (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    file_name    VARCHAR(255) NOT NULL,
    row_count    INT NOT NULL,
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE transactions ADD COLUMN import_batch_id UUID REFERENCES import_batches(id) ON DELETE SET NULL;

-- ---------- investments ----------
CREATE TABLE holdings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    account_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
    symbol           VARCHAR(20) NOT NULL,
    name             VARCHAR(160) NOT NULL,
    quantity         NUMERIC(24,8) NOT NULL CHECK (quantity >= 0),
    cost_basis_minor BIGINT NOT NULL CHECK (cost_basis_minor >= 0),
    price_minor      BIGINT NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
    currency         CHAR(3) NOT NULL,
    price_as_of      DATE
);
CREATE INDEX idx_holdings_ws ON holdings(workspace_id);

-- ---------- audit ----------
CREATE TABLE audit_log (
    id           BIGSERIAL PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    entity       VARCHAR(40) NOT NULL,
    entity_id    UUID,
    action       VARCHAR(20) NOT NULL,
    summary      TEXT,
    at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_ws ON audit_log(workspace_id, at DESC);

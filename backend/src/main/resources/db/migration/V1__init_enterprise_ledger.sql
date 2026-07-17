CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS ltree;

-- ==========================================
-- DOMAIN 1: AUTH & WORKSPACES
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE currencies (
    code CHAR(3) PRIMARY KEY,
    exponent INT NOT NULL CHECK (exponent >= 0),
    rounding_mode VARCHAR(20) NOT NULL DEFAULT 'HALF_UP'
);

-- Insert base currencies
INSERT INTO currencies (code, exponent, rounding_mode) VALUES 
('USD', 2, 'HALF_UP'),
('INR', 2, 'HALF_UP'),
('EUR', 2, 'HALF_UP'),
('GBP', 2, 'HALF_UP'),
('JPY', 0, 'HALF_UP');

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    functional_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE fx_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    quote_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    rate NUMERIC(20,10) NOT NULL CHECK (rate > 0),
    provider VARCHAR(50) NOT NULL,
    effective_at TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- DOMAIN 2: CHART OF ACCOUNTS
-- ==========================================
CREATE TABLE accounts (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    parent_id UUID,
    account_class TEXT NOT NULL CHECK (account_class IN ('ASSET','LIABILITY','EQUITY','INCOME','EXPENSE')),
    normal_side TEXT NOT NULL CHECK (normal_side IN ('DEBIT','CREDIT')),
    account_role TEXT NOT NULL CHECK (account_role IN ('BANK','CARD','CASH','CATEGORY','FX_CLEARING','ROUNDING')),
    native_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    path ltree NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (workspace_id, id),
    UNIQUE (workspace_id, path),
    FOREIGN KEY (workspace_id, parent_id) REFERENCES accounts(workspace_id, id) ON DELETE RESTRICT,
    CONSTRAINT chk_normal_side_matches_class CHECK (
        (account_class IN ('ASSET','EXPENSE') AND normal_side = 'DEBIT') OR
        (account_class IN ('LIABILITY','EQUITY','INCOME') AND normal_side = 'CREDIT')
    )
);

CREATE INDEX idx_accounts_path_gist ON accounts USING GIST (path);

CREATE TABLE account_balances (
    workspace_id UUID NOT NULL,
    account_id UUID NOT NULL,
    native_balance BIGINT NOT NULL DEFAULT 0,
    functional_balance BIGINT NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, account_id),
    FOREIGN KEY (workspace_id, account_id) REFERENCES accounts(workspace_id, id) ON DELETE CASCADE
);

-- ==========================================
-- DOMAIN 3: THE IMMUTABLE LEDGER
-- ==========================================
CREATE TABLE ledger (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    effective_at DATE NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reversal_of_id UUID,
    idempotency_key TEXT,
    source TEXT NOT NULL CHECK (source IN ('USER','IMPORT','SUBSCRIPTION','SYSTEM')),
    PRIMARY KEY (workspace_id, id),
    UNIQUE (workspace_id, idempotency_key),
    FOREIGN KEY (workspace_id, reversal_of_id) REFERENCES ledger(workspace_id, id) ON DELETE RESTRICT
);

CREATE TABLE ledger_entries (
    workspace_id UUID NOT NULL,
    ledger_id UUID NOT NULL,
    line_number INT NOT NULL CHECK (line_number > 0),
    account_id UUID NOT NULL,
    native_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    native_amount_minor BIGINT NOT NULL CHECK (native_amount_minor != 0),
    functional_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    functional_amount_minor BIGINT NOT NULL,
    fx_quote_id UUID REFERENCES fx_quotes(id) ON DELETE RESTRICT,
    PRIMARY KEY (workspace_id, ledger_id, line_number),
    FOREIGN KEY (workspace_id, ledger_id) REFERENCES ledger(workspace_id, id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id, account_id) REFERENCES accounts(workspace_id, id) ON DELETE RESTRICT
);

-- ==========================================
-- DOMAIN 4: THE UI ENVELOPE (READ MODEL)
-- ==========================================
CREATE TABLE payees (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'MERCHANT' CHECK (type IN ('MERCHANT','PERSON')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id),
    UNIQUE (workspace_id, name)
);

CREATE TABLE transactions (
    workspace_id UUID NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    ledger_id UUID NOT NULL,
    effective_at DATE NOT NULL,
    payee_id UUID,
    description TEXT,
    display_amount BIGINT NOT NULL CHECK (display_amount >= 0),
    display_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    type VARCHAR(20) NOT NULL CHECK (type IN ('EXPENSE','INCOME','TRANSFER')),
    subtype VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (subtype IN ('NORMAL','VOID')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id),
    UNIQUE (workspace_id, ledger_id),
    FOREIGN KEY (workspace_id, ledger_id) REFERENCES ledger(workspace_id, id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id, payee_id) REFERENCES payees(workspace_id, id) ON DELETE SET NULL
);

CREATE TABLE transaction_categories (
    workspace_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    category_id UUID NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    PRIMARY KEY (workspace_id, transaction_id, category_id),
    FOREIGN KEY (workspace_id, transaction_id) REFERENCES transactions(workspace_id, id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id, category_id) REFERENCES accounts(workspace_id, id) ON DELETE RESTRICT
);

CREATE TABLE tags (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    PRIMARY KEY (workspace_id, id),
    UNIQUE (workspace_id, name)
);

CREATE TABLE transaction_tags (
    workspace_id UUID NOT NULL,
    transaction_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (workspace_id, transaction_id, tag_id),
    FOREIGN KEY (workspace_id, transaction_id) REFERENCES transactions(workspace_id, id) ON DELETE CASCADE,
    FOREIGN KEY (workspace_id, tag_id) REFERENCES tags(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE comments (
    workspace_id UUID NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (length(body) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (workspace_id, id),
    FOREIGN KEY (workspace_id, transaction_id) REFERENCES transactions(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE attachments (
    workspace_id UUID NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id),
    FOREIGN KEY (workspace_id, transaction_id) REFERENCES transactions(workspace_id, id) ON DELETE CASCADE
);

-- ==========================================
-- DOMAIN 5: PLANNING & AUTOMATION
-- ==========================================
CREATE TABLE budgets (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL,
    name VARCHAR(255),
    amount_limit BIGINT NOT NULL CHECK (amount_limit > 0),
    period VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (period IN ('WEEKLY','MONTHLY','QUARTERLY','YEARLY')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (workspace_id, id),
    FOREIGN KEY (workspace_id, account_id) REFERENCES accounts(workspace_id, id) ON DELETE CASCADE
);

CREATE TABLE goals (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    target_amount BIGINT NOT NULL CHECK (target_amount > 0),
    saved_amount BIGINT NOT NULL DEFAULT 0 CHECK (saved_amount >= 0),
    target_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    due_date DATE,
    priority INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (workspace_id, id)
);

CREATE TABLE subscriptions (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    account_id UUID,
    category_id UUID,
    payee_id UUID,
    name VARCHAR(255) NOT NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    billing_cycle VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_cycle IN ('WEEKLY','MONTHLY','QUARTERLY','YEARLY')),
    next_billing_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    PRIMARY KEY (workspace_id, id),
    FOREIGN KEY (workspace_id, account_id) REFERENCES accounts(workspace_id, id) ON DELETE SET NULL,
    FOREIGN KEY (workspace_id, category_id) REFERENCES accounts(workspace_id, id) ON DELETE SET NULL,
    FOREIGN KEY (workspace_id, payee_id) REFERENCES payees(workspace_id, id) ON DELETE SET NULL
);

-- ==========================================
-- DOMAIN 6: SHARED SPACES
-- ==========================================
CREATE TABLE shared_spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    functional_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    invite_token_hash TEXT UNIQUE NOT NULL,
    invite_token_expires_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SETTLED','ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shared_personas (
    space_id UUID NOT NULL REFERENCES shared_spaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    linked_workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('OWNER','MEMBER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (space_id, id),
    UNIQUE (space_id, linked_workspace_id)
);

CREATE TABLE shared_ledger (
    space_id UUID NOT NULL REFERENCES shared_spaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    effective_at DATE NOT NULL,
    description TEXT,
    total_amount BIGINT NOT NULL CHECK (total_amount > 0),
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    reversal_of_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (space_id, id),
    FOREIGN KEY (space_id, reversal_of_id) REFERENCES shared_ledger(space_id, id) ON DELETE RESTRICT
);

CREATE TABLE shared_ledger_entries (
    space_id UUID NOT NULL,
    ledger_id UUID NOT NULL,
    persona_id UUID NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor != 0),
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    PRIMARY KEY (space_id, ledger_id, persona_id),
    FOREIGN KEY (space_id, ledger_id) REFERENCES shared_ledger(space_id, id) ON DELETE CASCADE,
    FOREIGN KEY (space_id, persona_id) REFERENCES shared_personas(space_id, id) ON DELETE RESTRICT
);

CREATE TABLE shared_settlements (
    space_id UUID NOT NULL REFERENCES shared_spaces(id) ON DELETE CASCADE,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    from_persona_id UUID NOT NULL,
    to_persona_id UUID NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL REFERENCES currencies(code),
    date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (space_id, id),
    FOREIGN KEY (space_id, from_persona_id) REFERENCES shared_personas(space_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (space_id, to_persona_id) REFERENCES shared_personas(space_id, id) ON DELETE RESTRICT,
    CHECK (from_persona_id != to_persona_id)
);

-- ==========================================
-- DOMAIN 7: PRIVACY BRIDGE
-- ==========================================
CREATE TABLE private_space_links (
    workspace_id UUID NOT NULL,
    personal_ledger_id UUID NOT NULL,
    shared_space_id UUID NOT NULL,
    shared_ledger_id UUID NOT NULL,
    PRIMARY KEY (workspace_id, personal_ledger_id, shared_space_id, shared_ledger_id),
    FOREIGN KEY (workspace_id, personal_ledger_id) REFERENCES ledger(workspace_id, id) ON DELETE CASCADE,
    FOREIGN KEY (shared_space_id, shared_ledger_id) REFERENCES shared_ledger(space_id, id) ON DELETE CASCADE
);

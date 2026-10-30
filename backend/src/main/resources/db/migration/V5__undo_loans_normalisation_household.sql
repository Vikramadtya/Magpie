-- ---------- undo ----------
-- Every edit or delete first stores the previous state, so any change can be reverted.
CREATE TABLE transaction_revisions (
    id             BIGSERIAL PRIMARY KEY,
    workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    transaction_id UUID NOT NULL,
    action         VARCHAR(10) NOT NULL CHECK (action IN ('UPDATE','DELETE')),
    snapshot       JSONB NOT NULL,
    actor          UUID REFERENCES users(id) ON DELETE SET NULL,
    at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    undone         BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_rev_tx ON transaction_revisions(transaction_id, id DESC);

-- ---------- loans (borrowed / lent) ----------
CREATE TABLE loans (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    person         VARCHAR(160) NOT NULL,
    direction      VARCHAR(10) NOT NULL CHECK (direction IN ('BORROWED','LENT')),
    principal_minor BIGINT NOT NULL CHECK (principal_minor > 0),
    currency       CHAR(3) NOT NULL,
    occurred_on    DATE NOT NULL,
    due_on         DATE,
    note           TEXT,
    created_by     UUID NOT NULL REFERENCES users(id),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);
CREATE INDEX idx_loans_ws ON loans(workspace_id) WHERE deleted_at IS NULL;

-- ---------- transactions: loan link, normalised (base-currency) amount, household link ----------
ALTER TABLE transactions ADD COLUMN loan_id UUID REFERENCES loans(id) ON DELETE SET NULL;
-- base_* is the amount in the workspace's base currency at that day's rate; editable (base_overridden)
ALTER TABLE transactions ADD COLUMN base_amount_minor BIGINT;
ALTER TABLE transactions ADD COLUMN base_currency CHAR(3);
ALTER TABLE transactions ADD COLUMN base_fx_rate NUMERIC(20,10);
ALTER TABLE transactions ADD COLUMN base_overridden BOOLEAN NOT NULL DEFAULT FALSE;
-- A personal transaction shared into a household ledger and its copy share a group id.
ALTER TABLE transactions ADD COLUMN shared_group_id UUID;
ALTER TABLE transactions ADD COLUMN shared_copy BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_tx_loan ON transactions(loan_id) WHERE loan_id IS NOT NULL;
CREATE INDEX idx_tx_shared ON transactions(shared_group_id) WHERE shared_group_id IS NOT NULL;
CREATE INDEX idx_tx_base_missing ON transactions(workspace_id) WHERE base_amount_minor IS NULL AND deleted_at IS NULL AND type <> 'TRANSFER';

-- ---------- households ----------
ALTER TABLE workspaces ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'PERSONAL' CHECK (kind IN ('PERSONAL','HOUSEHOLD'));

CREATE TABLE settlements (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    from_user    UUID NOT NULL REFERENCES users(id),
    to_user      UUID NOT NULL REFERENCES users(id),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    occurred_on  DATE NOT NULL,
    note         TEXT,
    created_by   UUID NOT NULL REFERENCES users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (from_user <> to_user)
);
CREATE INDEX idx_settlements_ws ON settlements(workspace_id);

-- ---------- live market data for holdings ----------
ALTER TABLE holdings ADD COLUMN provider_symbol VARCHAR(40);
ALTER TABLE holdings ADD COLUMN exchange VARCHAR(40);
ALTER TABLE holdings ADD COLUMN asset_type VARCHAR(20);
ALTER TABLE holdings ADD COLUMN price_updated_at TIMESTAMPTZ;
ALTER TABLE holdings ADD COLUMN price_source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' CHECK (price_source IN ('MANUAL','LIVE'));

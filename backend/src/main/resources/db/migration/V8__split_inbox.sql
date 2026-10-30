-- Group expenses are entered in the expense-split app and arrive here for review.
-- API tokens let that app (and only that app, only for this ledger) post items.
CREATE TABLE api_tokens (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name         VARCHAR(80) NOT NULL,
    prefix       VARCHAR(16) NOT NULL,
    token_hash   TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);

CREATE TABLE split_inbox (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    source           VARCHAR(30) NOT NULL DEFAULT 'expensesplit',
    external_id      VARCHAR(100) NOT NULL,
    kind             VARCHAR(12) NOT NULL CHECK (kind IN ('EXPENSE','SETTLEMENT')),
    group_ref        VARCHAR(100),
    group_name       VARCHAR(160),
    occurred_on      DATE NOT NULL,
    currency         CHAR(3) NOT NULL,
    total_minor      BIGINT NOT NULL CHECK (total_minor > 0),
    paid_by_me       BOOLEAN,
    my_share_minor   BIGINT,
    title            VARCHAR(255),
    counterparty     VARCHAR(160),
    direction        VARCHAR(10) CHECK (direction IN ('RECEIVED','PAID')),
    shares           JSONB NOT NULL DEFAULT '[]',
    external_version VARCHAR(80) NOT NULL,
    applied_version  VARCHAR(80),
    status           VARCHAR(12) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DISMISSED','CHANGED','REMOVED')),
    account_id       UUID,
    trip_id          UUID,
    created_tx_ids   UUID[] NOT NULL DEFAULT '{}',
    created_loan_ids UUID[] NOT NULL DEFAULT '{}',
    received_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, source, external_id, kind)
);
CREATE INDEX idx_inbox_ws_status ON split_inbox(workspace_id, status);

-- a trip created from a split-app group keeps the group's id so later expenses find it again
ALTER TABLE trips ADD COLUMN external_ref VARCHAR(100);
CREATE UNIQUE INDEX uq_trips_external ON trips(workspace_id, external_ref) WHERE external_ref IS NOT NULL;

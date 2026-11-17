-- "When it looks like this, file it under that": rules on the description (payee or note) and the amount.
CREATE TABLE rules (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(100) NOT NULL,
    text_match   VARCHAR(200),
    text_op      VARCHAR(12)  NOT NULL DEFAULT 'CONTAINS' CHECK (text_op IN ('CONTAINS', 'STARTS_WITH', 'EQUALS')),
    amount_op    VARCHAR(8) CHECK (amount_op IN ('GT', 'LT', 'EQ', 'BETWEEN')),
    amount_min   BIGINT,
    amount_max   BIGINT,
    tx_type      VARCHAR(8) CHECK (tx_type IN ('INCOME', 'EXPENSE')),
    category_id  UUID         NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    position     INT          NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (text_match IS NOT NULL OR amount_op IS NOT NULL)
);
CREATE INDEX idx_rules_ws ON rules (workspace_id, position);

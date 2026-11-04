-- A purchase that should be refunded: how much is expected, and when it has come back.
CREATE TABLE refunds (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id          UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    transaction_id        UUID        NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    expected_minor        BIGINT      NOT NULL CHECK (expected_minor > 0),
    received_minor        BIGINT      CHECK (received_minor >= 0),
    status                VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'DONE')),
    note                  TEXT,
    completed_on          DATE,
    refund_transaction_id UUID        REFERENCES transactions(id) ON DELETE SET NULL,
    created_by            UUID        REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_refunds_transaction ON refunds (transaction_id);
CREATE INDEX idx_refunds_ws ON refunds (workspace_id, status);

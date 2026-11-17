-- A photo or PDF attached to a transaction. The file is stored sealed, like notes.
CREATE TABLE receipts (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id   UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    transaction_id UUID         NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    filename       VARCHAR(160) NOT NULL,
    content_type   VARCHAR(40)  NOT NULL,
    size_bytes     INT          NOT NULL,
    data_enc       TEXT         NOT NULL,
    created_by     UUID REFERENCES users(id),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_receipts_tx ON receipts (transaction_id);
CREATE INDEX idx_receipts_ws ON receipts (workspace_id);

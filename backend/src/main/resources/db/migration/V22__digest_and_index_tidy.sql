-- Weekly digest settings: the webhook is a secret, so it is stored sealed (like notes).
CREATE TABLE digest_settings (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    webhook_enc  TEXT,
    enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
    last_sent_at TIMESTAMPTZ
);

-- Notes are encrypted, so text search happens in the app and this index could never be used;
-- it only slowed every write.
DROP INDEX IF EXISTS idx_tx_note_trgm;

-- The chart and rule queries group and filter by these.
CREATE INDEX IF NOT EXISTS idx_tx_payee ON transactions (workspace_id, payee_id, occurred_on)
    WHERE deleted_at IS NULL AND payee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_recurring ON transactions (recurring_rule_id)
    WHERE recurring_rule_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tx_tags_tag ON transaction_tags (tag_id, transaction_id);

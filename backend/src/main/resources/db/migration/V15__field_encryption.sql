-- Per-workspace data keys, stored only in wrapped (encrypted) form.
CREATE TABLE workspace_keys (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    wrapped_key  BYTEA NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Encrypted comment text is longer than the plain text, so the length is checked in the app.
ALTER TABLE transaction_comments DROP CONSTRAINT IF EXISTS transaction_comments_body_check;
ALTER TABLE transaction_comments ADD CONSTRAINT transaction_comments_body_check CHECK (length(body) > 0);

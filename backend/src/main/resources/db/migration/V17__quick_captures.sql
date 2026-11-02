-- Transactions entered on the quick-add page while the server was asleep. They wait here until the
-- owner reviews them (the "To review" list); nothing is recorded in the ledger by itself.
CREATE TABLE quick_captures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(10) NOT NULL CHECK (type IN ('EXPENSE','INCOME')),
    amount_minor    BIGINT NOT NULL CHECK (amount_minor > 0),
    currency        CHAR(3) NOT NULL,
    occurred_on     DATE NOT NULL,
    account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    payee_text      VARCHAR(160),
    note            VARCHAR(1000),
    status          VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACCEPTED','DISMISSED')),
    transaction_id  UUID,
    idempotency_key VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_captures_pending ON quick_captures(workspace_id, status, created_at);
CREATE UNIQUE INDEX uq_captures_key ON quick_captures(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- The quick-add page runs outside the main server and connects with a very limited database role
-- (created by hand, see docs/QUICKADD.md). Grant it only what it needs, if it exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quickadd') THEN
    GRANT SELECT (id, email, name, deleted_at) ON users TO quickadd;
    GRANT SELECT (workspace_id, user_id, role, joined_at) ON workspace_members TO quickadd;
    GRANT SELECT (id, workspace_id, name, type, currency, is_archived, memo) ON accounts TO quickadd;
    GRANT SELECT (id, workspace_id, parent_id, name, kind, is_archived) ON categories TO quickadd;
    GRANT INSERT ON quick_captures TO quickadd;
    GRANT SELECT (id, user_id, status, created_at, idempotency_key) ON quick_captures TO quickadd;
  END IF;
END $$;

-- Keeper is personal only. Group spending and settling up belong to the expense-split app.
-- Shared ledgers (and the copies in them) are removed; personal ledgers keep everything.
DELETE FROM transactions WHERE workspace_id IN (SELECT id FROM workspaces WHERE kind = 'SHARED');
DELETE FROM workspaces WHERE kind = 'SHARED';
DROP TABLE IF EXISTS settlements;
DROP TABLE IF EXISTS workspace_invites;
DELETE FROM workspace_members WHERE role <> 'OWNER';
DROP INDEX IF EXISTS idx_tx_shared;
ALTER TABLE transactions DROP COLUMN IF EXISTS shared_group_id;
ALTER TABLE transactions DROP COLUMN IF EXISTS shared_copy;
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_kind_check;
ALTER TABLE workspaces DROP COLUMN IF EXISTS kind;

-- A trip: a named, dated container in your own ledger. Expenses are attached to it.
CREATE TABLE trips (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(160) NOT NULL,
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    budget_minor BIGINT CHECK (budget_minor IS NULL OR budget_minor > 0),
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date >= start_date)
);
CREATE INDEX idx_trips_ws ON trips(workspace_id, start_date DESC);
ALTER TABLE transactions ADD COLUMN trip_id UUID REFERENCES trips(id) ON DELETE SET NULL;
CREATE INDEX idx_tx_trip ON transactions(trip_id) WHERE trip_id IS NOT NULL;

-- Someone other than the ledger's owner can spend on the owner's accounts (a partner using a lent card).
-- A person here is just a name; it does not need a Keeper account.
CREATE TABLE people (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_people_name ON people(workspace_id, lower(name));

-- NULL means "me". RESTRICT: a person with spending can't vanish and turn their purchases into yours.
ALTER TABLE transactions ADD COLUMN spent_by UUID REFERENCES people(id) ON DELETE RESTRICT;
CREATE INDEX idx_tx_spent_by ON transactions(spent_by) WHERE spent_by IS NOT NULL;

-- Whether a budget also counts what others spend (e.g. Food yes, Entertainment no).
ALTER TABLE budgets ADD COLUMN include_others BOOLEAN NOT NULL DEFAULT FALSE;

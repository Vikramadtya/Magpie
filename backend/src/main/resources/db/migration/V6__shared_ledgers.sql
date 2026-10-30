-- "Household" generalises to a shared ledger: a read-only group view (a trip, a flat, a couple)
-- fed by expenses its members share from their own personal ledger.
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_kind_check;
UPDATE workspaces SET kind = 'SHARED' WHERE kind = 'HOUSEHOLD';
ALTER TABLE workspaces ADD CONSTRAINT workspaces_kind_check CHECK (kind IN ('PERSONAL','SHARED'));

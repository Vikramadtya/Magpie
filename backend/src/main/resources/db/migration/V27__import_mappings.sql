CREATE TABLE import_mappings (
  id           UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  date_col     TEXT NOT NULL,
  amount_col   TEXT,
  debit_col    TEXT,
  credit_col   TEXT,
  desc_col     TEXT,
  date_format  TEXT NOT NULL DEFAULT 'ISO',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX import_mappings_name ON import_mappings(workspace_id, lower(name));

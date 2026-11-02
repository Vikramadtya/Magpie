-- Who is who across Keeper and the expense-split app. The connection is bound to one split-app person
-- (and whether their email matches the Keeper user), and every friend the split app mentions gets one
-- row here, keyed by the split app's own stable id. `label` is the name Keeper uses for that friend's
-- loans; the owner can edit it (for instance to join an existing person), names sent later never overwrite it.
ALTER TABLE api_tokens ADD COLUMN external_user_id VARCHAR(100);
ALTER TABLE api_tokens ADD COLUMN external_name VARCHAR(160);
ALTER TABLE api_tokens ADD COLUMN external_email VARCHAR(255);
ALTER TABLE api_tokens ADD COLUMN email_matched BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE api_tokens ADD COLUMN linked_at TIMESTAMPTZ;

CREATE TABLE split_people (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    external_id  VARCHAR(100) NOT NULL,
    name         VARCHAR(160) NOT NULL,
    email        VARCHAR(255),
    label        VARCHAR(160) NOT NULL,
    label_edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workspace_id, external_id)
);

ALTER TABLE split_inbox ADD COLUMN counterparty_id VARCHAR(100);

-- A transfer is money handed to or received from a friend outside any split (a loan in Keeper).
ALTER TABLE split_inbox DROP CONSTRAINT split_inbox_kind_check;
ALTER TABLE split_inbox ADD CONSTRAINT split_inbox_kind_check CHECK (kind IN ('EXPENSE','SETTLEMENT','TRANSFER'));

-- Revocable keys for the quick-add endpoint (phone form, iPhone Shortcut, Google Form, ...). A key
-- belongs to one user and one ledger, is stored only as a SHA-256 hash, and can only add entries to
-- the "To review" list.
CREATE TABLE quick_api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label        VARCHAR(60) NOT NULL,
    key_prefix   VARCHAR(12) NOT NULL,
    key_hash     CHAR(64) NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);
CREATE INDEX idx_quick_keys_ws ON quick_api_keys(workspace_id) WHERE revoked_at IS NULL;

-- Whether the owner has proved they control the email. Password sign-ups are unverified until they
-- sign in with Google; this stops someone pre-registering your email with their own password and
-- sharing the account once you sign in with Google. Accounts that already exist are trusted as is.
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET email_verified = TRUE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quickadd') THEN
    GRANT SELECT (id, user_id, workspace_id, key_hash, revoked_at) ON quick_api_keys TO quickadd;
    GRANT UPDATE (last_used_at) ON quick_api_keys TO quickadd;
  END IF;
END $$;

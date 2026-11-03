-- A quick-add key can be linked to the owner's Discord account, so the /spend and /income commands in
-- Discord file entries under that key. A Discord account is linked to at most one active key.
ALTER TABLE quick_api_keys ADD COLUMN discord_user_id VARCHAR(32);
CREATE UNIQUE INDEX uq_quick_keys_discord ON quick_api_keys(discord_user_id)
    WHERE revoked_at IS NULL AND discord_user_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'quickadd') THEN
    GRANT SELECT (discord_user_id) ON quick_api_keys TO quickadd;
    -- lets the Discord form start with the account used last
    GRANT SELECT (account_id) ON quick_captures TO quickadd;
  END IF;
END $$;

-- Lending an account: the owner's account stays in the owner's ledger. The guest gets a memo copy in
-- their own ledger; what the guest records on it is mirrored into the owner's ledger as spending
-- by the guest.
CREATE TABLE account_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    guest_email VARCHAR(255) NOT NULL,
    guest_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE','REVOKED','DECLINED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_share_open ON account_shares(account_id, lower(guest_email)) WHERE status IN ('PENDING','ACTIVE');
CREATE INDEX idx_share_guest ON account_shares(lower(guest_email)) WHERE status = 'PENDING';

ALTER TABLE accounts ADD COLUMN memo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE accounts ADD COLUMN share_id UUID REFERENCES account_shares(id) ON DELETE SET NULL;

-- On the owner's mirrored row: the guest's transaction it copies.
ALTER TABLE transactions ADD COLUMN mirror_of UUID REFERENCES transactions(id) ON DELETE SET NULL;
CREATE INDEX idx_tx_mirror ON transactions(mirror_of) WHERE mirror_of IS NOT NULL;

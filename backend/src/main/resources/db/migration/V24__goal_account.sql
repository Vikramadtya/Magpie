-- A goal can follow an account: its progress is then that account's balance, so it updates itself.
ALTER TABLE goals ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

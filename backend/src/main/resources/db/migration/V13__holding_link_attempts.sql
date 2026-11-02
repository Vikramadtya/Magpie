-- When Keeper last tried to find a live price source for a holding that was entered by hand.
ALTER TABLE holdings ADD COLUMN link_checked_at TIMESTAMPTZ;

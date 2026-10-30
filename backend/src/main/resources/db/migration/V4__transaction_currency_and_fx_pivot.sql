-- Transactions can be entered in a currency other than the account's. amount_minor/currency stay the
-- account-currency amount (what moves the balance); the entered amount is kept for display.
ALTER TABLE transactions ADD COLUMN orig_amount_minor BIGINT CHECK (orig_amount_minor IS NULL OR orig_amount_minor > 0);
ALTER TABLE transactions ADD COLUMN orig_currency CHAR(3);

-- Exchange rates are now stored once, against a USD pivot, so any currency pair can be derived.
DELETE FROM exchange_rates;

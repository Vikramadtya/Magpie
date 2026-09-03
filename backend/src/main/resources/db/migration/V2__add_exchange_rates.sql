CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY,
    source_currency VARCHAR(3) NOT NULL,
    target_currency VARCHAR(3) NOT NULL,
    rate NUMERIC(19, 6) NOT NULL,
    effective_date TIMESTAMP NOT NULL
);
CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(source_currency, target_currency, effective_date DESC);

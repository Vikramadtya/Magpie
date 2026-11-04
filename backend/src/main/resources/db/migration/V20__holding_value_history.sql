-- One row per holding per day: its value as last recorded that day. A trigger keeps it current for
-- every way a price or quantity can change (live refresh, upload, hand edit, new purchase).
CREATE TABLE holding_values (
    holding_id   UUID          NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
    workspace_id UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    as_of        DATE          NOT NULL,
    price_minor  BIGINT        NOT NULL,
    quantity     NUMERIC(24,8) NOT NULL,
    value_minor  BIGINT        NOT NULL,
    PRIMARY KEY (holding_id, as_of)
);
CREATE INDEX idx_holding_values_ws ON holding_values (workspace_id, as_of);

CREATE FUNCTION record_holding_value() RETURNS trigger AS $$
BEGIN
    INSERT INTO holding_values (holding_id, workspace_id, as_of, price_minor, quantity, value_minor)
    VALUES (NEW.id, NEW.workspace_id, CURRENT_DATE, NEW.price_minor, NEW.quantity,
            ROUND(NEW.quantity * NEW.price_minor)::bigint)
    ON CONFLICT (holding_id, as_of) DO UPDATE
        SET price_minor = EXCLUDED.price_minor, quantity = EXCLUDED.quantity, value_minor = EXCLUDED.value_minor;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER holdings_value_history
    AFTER INSERT OR UPDATE OF price_minor, quantity ON holdings
    FOR EACH ROW EXECUTE FUNCTION record_holding_value();

-- Start the history from what is known today.
INSERT INTO holding_values (holding_id, workspace_id, as_of, price_minor, quantity, value_minor)
SELECT id, workspace_id, CURRENT_DATE, price_minor, quantity, ROUND(quantity * price_minor)::bigint FROM holdings;

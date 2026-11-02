-- A holding is the sum of its purchases, so a stock or fund can be bought on many dates.
CREATE TABLE holding_lots (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    holding_id   UUID NOT NULL REFERENCES holdings(id) ON DELETE CASCADE,
    bought_on    DATE NOT NULL,
    quantity     NUMERIC(24,8) NOT NULL CHECK (quantity > 0),
    cost_minor   BIGINT NOT NULL CHECK (cost_minor >= 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_lots_holding ON holding_lots(holding_id, bought_on);

INSERT INTO holding_lots(workspace_id, holding_id, bought_on, quantity, cost_minor)
SELECT workspace_id, id, COALESCE(purchased_on, price_as_of, CURRENT_DATE), quantity, cost_basis_minor
FROM holdings WHERE quantity > 0;

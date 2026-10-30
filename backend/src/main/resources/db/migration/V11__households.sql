-- A household is a read-only combined view over its members' own ledgers. It stores only who is in
-- it, what each member agrees to share, and the household's budget targets. No money lives here.
CREATE TABLE households (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(120) NOT NULL,
    currency    CHAR(3) NOT NULL,
    created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE household_members (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id      UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    email             VARCHAR(255) NOT NULL,
    user_id           UUID REFERENCES users(id) ON DELETE CASCADE,
    status            VARCHAR(8) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','ACTIVE')),
    share_spending    BOOLEAN NOT NULL DEFAULT TRUE,
    share_net_worth   BOOLEAN NOT NULL DEFAULT FALSE,
    share_investments BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_household_member_email ON household_members(household_id, lower(email));
CREATE INDEX idx_household_member_user ON household_members(user_id);

CREATE TABLE household_budgets (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    category_name VARCHAR(120) NOT NULL,
    amount_minor  BIGINT NOT NULL CHECK (amount_minor >= 0)
);
CREATE UNIQUE INDEX uq_household_budget ON household_budgets(household_id, lower(category_name));

-- Who may use what. A user is on the Free plan unless they pay (subscriptions) or hold an unexpired
-- access grant (from a code, from an admin, or the one-off grant given to people who joined before plans).
CREATE TABLE subscriptions (
    user_id                  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan                     VARCHAR(10)  NOT NULL DEFAULT 'PRO' CHECK (plan IN ('PRO')),
    status                   VARCHAR(20)  NOT NULL,
    provider                 VARCHAR(30)  NOT NULL,
    provider_customer_id     VARCHAR(120),
    provider_subscription_id VARCHAR(120),
    current_period_end       TIMESTAMPTZ,
    cancel_at_period_end     BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE codes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code             VARCHAR(40)  NOT NULL,
    kind             VARCHAR(10)  NOT NULL CHECK (kind IN ('ACCESS', 'DISCOUNT')),
    description      VARCHAR(200),
    active           BOOLEAN      NOT NULL DEFAULT TRUE,
    starts_at        TIMESTAMPTZ,
    expires_at       TIMESTAMPTZ,
    max_redemptions  INT CHECK (max_redemptions IS NULL OR max_redemptions > 0),
    per_user_limit   INT          NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
    redeemed_count   INT          NOT NULL DEFAULT 0,
    access_days      INT CHECK (access_days IS NULL OR access_days > 0),
    discount_percent INT CHECK (discount_percent IS NULL OR discount_percent BETWEEN 1 AND 100),
    discount_minor   BIGINT CHECK (discount_minor IS NULL OR discount_minor > 0),
    discount_cycles  INT CHECK (discount_cycles IS NULL OR discount_cycles > 0),
    created_by       UUID REFERENCES users(id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CHECK (
        (kind = 'ACCESS' AND access_days IS NOT NULL AND discount_percent IS NULL AND discount_minor IS NULL)
        OR (kind = 'DISCOUNT' AND access_days IS NULL AND ((discount_percent IS NOT NULL) <> (discount_minor IS NOT NULL)))
    )
);
CREATE UNIQUE INDEX uq_codes_code ON codes (upper(code));

CREATE TABLE code_redemptions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_id     UUID        NOT NULL REFERENCES codes(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    grants_until TIMESTAMPTZ
);
CREATE INDEX idx_redemptions_code ON code_redemptions (code_id);
CREATE INDEX idx_redemptions_user ON code_redemptions (user_id, code_id);

CREATE TABLE access_grants (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_until TIMESTAMPTZ NOT NULL,
    source        VARCHAR(12) NOT NULL CHECK (source IN ('CODE', 'ADMIN', 'GRANDFATHER')),
    code_id       UUID REFERENCES codes(id) ON DELETE SET NULL,
    note          VARCHAR(200),
    granted_by    UUID REFERENCES users(id),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_grants_user ON access_grants (user_id, granted_until DESC);

-- Everyone who is here today keeps full access for 90 days, so switching limits on later is not a surprise.
INSERT INTO access_grants (user_id, granted_until, source, note)
SELECT id, NOW() + INTERVAL '90 days', 'GRANDFATHER', 'Early user' FROM users;

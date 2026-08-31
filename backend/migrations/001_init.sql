-- 001_init.sql
-- Initial schema, matching docs/ARCHITECTURE.md §3 (Phase 1, approved) plus the refresh_tokens
-- table needed for real rotation/revocation (Phase 3 §12).
--
-- Portability note: this file is written to run unmodified against BOTH PostgreSQL (production,
-- see src/db/PgClient.ts) and SQLite (used only for this project's own automated tests, see
-- src/db/SqliteClient.ts) so there is exactly one schema definition, not two that could drift
-- apart. Concretely this means:
--   - IDs are TEXT (UUIDs generated in application code via crypto.randomUUID(), never
--     DB-generated) instead of Postgres-only gen_random_uuid()/SERIAL.
--   - Enums are TEXT + CHECK(...) instead of native Postgres ENUM types.
--   - Timestamps are TEXT (ISO-8601, written by application code) instead of native TIMESTAMPTZ,
--     which keeps sorting/comparison correct in both engines without relying on
--     engine-specific "now()" defaults.
--   - No JSONB — audit_logs old/new values are stored as TEXT containing a JSON string.

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'driver')),
    phone_verified INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE owners (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    company_name TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE drivers (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    license_number TEXT,
    -- Phase 2 addendum §11.8: pay is EITHER percent OR salary — one type + one value column,
    -- never two independent nullable columns.
    pay_type TEXT NOT NULL DEFAULT 'percent' CHECK (pay_type IN ('percent', 'salary')),
    pay_value INTEGER NOT NULL DEFAULT 20,
    created_at TEXT NOT NULL
);

CREATE TABLE trucks (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    plate TEXT NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    model_year TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_trucks_owner_id ON trucks(owner_id);

CREATE TABLE driver_trucks (
    id TEXT PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);
CREATE INDEX idx_driver_trucks_driver_id ON driver_trucks(driver_id);
CREATE INDEX idx_driver_trucks_truck_id ON driver_trucks(truck_id);

CREATE TABLE invitations (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    driver_phone TEXT NOT NULL,
    truck_id TEXT REFERENCES trucks(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    accepted_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_invitations_owner_id ON invitations(owner_id);
CREATE INDEX idx_invitations_driver_phone ON invitations(driver_phone);

-- Phase 3 §12: refresh tokens must be revocable and rotatable, which requires a DB record per
-- token rather than trusting a stateless JWT alone. Only the HASH is stored (never the raw
-- token), the same principle as password storage — see src/security/tokens.ts.
CREATE TABLE refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    replaced_by_token_id TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Accounting tables — schema ready per Phase 1 §3 and Phase 2 addendum §11.2, but Phase 3 does
-- NOT ship CRUD endpoints for these (project rule: financial logic stays a placeholder/zero
-- until a later phase). Creating them now means the eventual accounting-engine phase is purely
-- additive (new endpoints + business logic), never a schema migration that risks existing data.
CREATE TABLE trips (
    id TEXT PRIMARY KEY,
    truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    cargo_type TEXT,
    cargo_weight TEXT,
    income INTEGER NOT NULL DEFAULT 0,
    commission INTEGER NOT NULL DEFAULT 0,
    trip_date TEXT NOT NULL,
    description TEXT,
    settled INTEGER NOT NULL DEFAULT 0,
    paid_to TEXT CHECK (paid_to IN ('driver', 'owner')),
    created_at TEXT NOT NULL
);
CREATE INDEX idx_trips_truck_id ON trips(truck_id);
CREATE INDEX idx_trips_driver_id ON trips(driver_id);

CREATE TABLE expenses (
    id TEXT PRIMARY KEY,
    truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    expense_date TEXT NOT NULL,
    description TEXT,
    receipt_url TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE settlements (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    truck_id TEXT NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_income INTEGER NOT NULL DEFAULT 0,
    total_expense INTEGER NOT NULL DEFAULT 0,
    net_payable INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
    created_at TEXT NOT NULL
);

CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    settlement_id TEXT NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    method TEXT,
    created_at TEXT NOT NULL
);

-- Phase 3 §33: audit log for security-sensitive actions.
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

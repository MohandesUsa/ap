-- 001_init.sql
-- Initial schema, matching docs/ARCHITECTURE.md §3 (Phase 1, approved) plus the refresh_tokens
-- table needed for real rotation/revocation (Phase 3 §12).
--
-- Portability note (Phase 3.1): this file is written to run unmodified against BOTH MySQL/MariaDB
-- (production, see src/db/MySqlClient.ts) and SQLite (used only for this project's own automated
-- tests, see src/db/SqliteClient.ts) so there is exactly one schema definition, not two that could
-- drift apart. Concretely this means:
--   - IDs and foreign keys are VARCHAR(36) (a UUID's exact rendered length), generated in
--     application code via crypto.randomUUID(), never DB-generated — MySQL cannot put a UNIQUE
--     index, PRIMARY KEY, or FOREIGN KEY on a TEXT/BLOB column without an explicit prefix length,
--     so every id-shaped column needs a real declared length. SQLite ignores VARCHAR(N)'s length
--     entirely (TEXT affinity) but stores and compares the values identically either way.
--   - Other UNIQUE-constrained free text (phone numbers, plates, tokens) is VARCHAR with a length
--     generous enough for its real values (see the comment on each), for the same reason.
--   - Enums are TEXT/VARCHAR + CHECK(...) instead of a native ENUM type — requires MySQL 8.0.16+
--     or MariaDB 10.2.1+ for CHECK to actually be enforced (older versions parse but silently
--     ignore it, both long past end-of-life for anything this project targets), and SQLite has
--     supported CHECK for as long as this project has existed. Any enum column that also has a
--     DEFAULT must be VARCHAR(N), never TEXT — real MySQL 8.0 (unlike MariaDB, which is lenient
--     here) rejects a plain DEFAULT on TEXT/BLOB/GEOMETRY/JSON columns outright
--     (ER_BLOB_CANT_HAVE_DEFAULT). This was caught late: the whole suite passed against MariaDB
--     10.11 without ever exercising this path, and it only surfaced against a real MySQL 8.0
--     Docker image on first deploy.
--   - Timestamps are TEXT (ISO-8601, written by application code) instead of a native TIMESTAMP
--     type, which keeps sorting/comparison correct on both engines without relying on
--     engine-specific "now()"/CURRENT_TIMESTAMP defaults or timezone-conversion quirks.
--   - No JSONB — audit_logs old/new values are stored as TEXT containing a JSON string.
--   - No explicit ENGINE=InnoDB on any table: SQLite has no such clause at all (its parser would
--     reject the syntax), and both MySQL 8+ and MariaDB 10+ already default to InnoDB, which is
--     what foreign keys here require anyway — leaving it implicit keeps one file valid on both.

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'driver')),
    phone_verified INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE owners (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    company_name TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE drivers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    license_number TEXT,
    -- Phase 2 addendum §11.8: pay is EITHER percent OR salary — one type + one value column,
    -- never two independent nullable columns.
    pay_type VARCHAR(20) NOT NULL DEFAULT 'percent' CHECK (pay_type IN ('percent', 'salary')),
    pay_value INTEGER NOT NULL DEFAULT 20,
    created_at TEXT NOT NULL
);

CREATE TABLE trucks (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    -- 64 chars comfortably covers an Iranian plate string ("22 الف 262 ایران 22") with room to
    -- spare — VARCHAR length is counted in characters, not bytes, so the Persian text is fine.
    plate VARCHAR(64) NOT NULL UNIQUE,
    brand TEXT NOT NULL,
    model_year TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_trucks_owner_id ON trucks(owner_id);

CREATE TABLE driver_trucks (
    id VARCHAR(36) PRIMARY KEY,
    driver_id VARCHAR(36) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    truck_id VARCHAR(36) NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    start_date TEXT NOT NULL,
    end_date TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);
CREATE INDEX idx_driver_trucks_driver_id ON driver_trucks(driver_id);
CREATE INDEX idx_driver_trucks_truck_id ON driver_trucks(truck_id);

CREATE TABLE invitations (
    id VARCHAR(36) PRIMARY KEY,
    -- inviteCode (10 chars) + ":" + a base64url-encoded 32-byte token (~43 chars) — 128 leaves
    -- comfortable headroom (see security/tokens.ts).
    token VARCHAR(128) NOT NULL UNIQUE,
    owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    driver_phone VARCHAR(20) NOT NULL,
    truck_id VARCHAR(36) REFERENCES trucks(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    accepted_by_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_invitations_owner_id ON invitations(owner_id);
CREATE INDEX idx_invitations_driver_phone ON invitations(driver_phone);

-- Phase 3 §12: refresh tokens must be revocable and rotatable, which requires a DB record per
-- token rather than trusting a stateless JWT alone. Only the HASH is stored (never the raw
-- token), the same principle as password storage — see src/security/tokens.ts (sha256 hex = 64
-- chars, exactly).
CREATE TABLE refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    replaced_by_token_id VARCHAR(36),
    created_at TEXT NOT NULL
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Accounting tables (Phase 4): trips, expenses, settlements, and payments — see
-- src/modules/trips, src/modules/expenses, src/modules/settlement.
CREATE TABLE trips (
    id VARCHAR(36) PRIMARY KEY,
    truck_id VARCHAR(36) NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    driver_id VARCHAR(36) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
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
    id VARCHAR(36) PRIMARY KEY,
    truck_id VARCHAR(36) NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    driver_id VARCHAR(36) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    expense_date TEXT NOT NULL,
    description TEXT,
    receipt_url TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE settlements (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    driver_id VARCHAR(36) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    truck_id VARCHAR(36) NOT NULL REFERENCES trucks(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    total_income INTEGER NOT NULL DEFAULT 0,
    total_expense INTEGER NOT NULL DEFAULT 0,
    net_payable INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
    created_at TEXT NOT NULL
);

CREATE TABLE payments (
    id VARCHAR(36) PRIMARY KEY,
    settlement_id VARCHAR(36) NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    payment_date TEXT NOT NULL,
    method TEXT,
    created_at TEXT NOT NULL
);

-- Phase 3 §33: audit log for security-sensitive actions.
CREATE TABLE audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    -- VARCHAR, not TEXT: this column is indexed below, and real MySQL 8.0 (unlike MariaDB)
    -- rejects indexing a bare TEXT/BLOB column without an explicit prefix length outright
    -- (ER_BLOB_KEY_WITHOUT_LENGTH) — action names are short fixed identifiers, so a real length
    -- limit costs nothing (longest in use today is 31 chars; 64 leaves headroom).
    action VARCHAR(64) NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_value TEXT,
    new_value TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 003_device_approval.sql — single-trusted-device login approval.
--
-- Product rule (explicit user decision, not in the original 39-phase spec): "اولین گوشی که
-- ثبت‌نام کرد، اگر گوشی دیگری خواست وارد شود گوشی که الان هست باید تایید کند ورود را" — the
-- first device to register/login becomes the account's trusted device. A login attempt from any
-- OTHER device does not get tokens immediately; it creates a pending request that only the
-- CURRENTLY trusted device can approve or deny. Approving a request transfers trust to the new
-- device (so a user really can switch phones — the old phone would then need approval to log
-- back in). Same portability rules as 001_init.sql/002_admin.sql: VARCHAR(36) ids, TEXT+CHECK
-- enums, TEXT timestamps, one file valid on both MySQL/MariaDB and SQLite.

ALTER TABLE users ADD COLUMN trusted_device_id VARCHAR(255);

CREATE TABLE device_login_requests (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id VARCHAR(255) NOT NULL,
    device_label TEXT,
    -- VARCHAR, not TEXT, deliberately: this column is part of a composite index below, and
    -- MariaDB rejects a composite index that includes a bare TEXT column ("key was too long")
    -- once combined with another column's key bytes — a short enum value fits VARCHAR(20) fine.
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired', 'consumed')),
    created_at TEXT NOT NULL,
    decided_at TEXT
);

CREATE INDEX idx_device_login_requests_user_status ON device_login_requests(user_id, status);

-- 002_admin.sql — Admin App backend (Phase A / admin-app-spec).
--
-- Reuses the SAME central database as the User App (no second database — see the spec's rule
-- against creating one). Same portability rules as 001_init.sql: VARCHAR(36) for ids/foreign
-- keys (UUIDs generated in application code), TEXT+CHECK for enums, TEXT for free-form
-- timestamps, one file valid on both MySQL/MariaDB and SQLite.
--
-- Naming note: this file adds its own `orders` and `subscription_payments` tables, kept
-- deliberately distinct from 001_init.sql's `payments` table — that one already means something
-- different in this schema (a manual payment recorded against a DRIVER's settlement ledger, see
-- src/modules/settlement). Subscription billing and driver settlement are unrelated concepts
-- that happen to both involve "a payment"; giving them separate tables avoids conflating two
-- different money flows under one name.

CREATE TABLE admins (
    id VARCHAR(36) PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'ACCOUNTANT')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Additive custom grants on top of an admin's role defaults (Phase 22/permissions.ts owns the
-- role-default list) — lets a SUPER_ADMIN hand one ADMIN an extra permission without changing
-- their whole role. A permission here is ALWAYS a grant, never a revocation of a role default;
-- there is deliberately no way to take away a permission the role itself grants — demote the
-- role instead.
CREATE TABLE admin_permissions (
    admin_id VARCHAR(36) NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    permission VARCHAR(64) NOT NULL,
    granted_at TEXT NOT NULL,
    granted_by VARCHAR(36) REFERENCES admins(id) ON DELETE SET NULL,
    PRIMARY KEY (admin_id, permission)
);

CREATE TABLE subscription_plans (
    id VARCHAR(36) PRIMARY KEY,
    name TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    price INTEGER NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- One owner can have many subscriptions over time (renewals, plan changes); "the current one" is
-- whichever has the latest expires_at with status IN ('active','pending'). Only owners subscribe
-- in this product (drivers ride on their owner's account), matching the User App's own paywall,
-- which only ever gates the owner/driver *app roles*, not a separate driver subscription.
CREATE TABLE subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    plan_id VARCHAR(36) NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),
    started_at TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_subscriptions_owner_id ON subscriptions(owner_id);

CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    plan_id VARCHAR(36) NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
    subscription_id VARCHAR(36) REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_orders_owner_id ON orders(owner_id);

CREATE TABLE subscription_payments (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'successful', 'failed')),
    reference_id TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX idx_subscription_payments_order_id ON subscription_payments(order_id);

-- Generic key/value settings store — covers SMS config, payment-provider config, system settings,
-- and feature flags (Phases 14/15/17/18) with one table instead of four near-identical ones.
-- Namespaced keys by convention: sms.provider, sms.username, sms.api_key, sms.sender,
-- sms.template, payment.provider, payment.merchant_id, payment.api_key, system.app_name,
-- system.support_phone, system.maintenance_mode, feature.ENABLE_X, etc. `is_secret` rows
-- (API keys) are stored ENCRYPTED (see security/secretCrypto.ts) and are always masked in API
-- responses — see admin-settings module.
CREATE TABLE settings (
    `key` VARCHAR(100) PRIMARY KEY,
    value TEXT,
    is_secret INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    updated_by VARCHAR(36) REFERENCES admins(id) ON DELETE SET NULL
);

-- audit_logs.user_id (001_init.sql) references `users`, which has no row for an admin (admins is
-- its own table — Phase 3: Admin App has its own auth, not the user login). Every admin action
-- needs to be attributed to WHO did it, same as a user action is, so audit_logs needs a second,
-- separate actor column rather than overloading user_id with a value that would violate its FK.
ALTER TABLE audit_logs ADD COLUMN admin_id VARCHAR(36) REFERENCES admins(id) ON DELETE SET NULL;
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);

CREATE TABLE notifications (
    id VARCHAR(36) PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target TEXT NOT NULL CHECK (target IN ('all', 'owners', 'drivers', 'specific_user', 'active_subscribers', 'expired_subscribers')),
    target_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    created_by VARCHAR(36) NOT NULL REFERENCES admins(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
);

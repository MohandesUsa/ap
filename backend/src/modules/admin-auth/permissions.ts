/**
 * Phase 22's permission list, verbatim. Every admin route that reads or changes something checks
 * one of these — never just "is this role X", because SUPER_ADMIN can grant a one-off permission
 * to a lower role without changing their whole role (see admin_permissions in 002_admin.sql).
 */
export const PERMISSIONS = [
  'USERS_VIEW', 'USERS_EDIT',
  'OWNERS_VIEW', 'DRIVERS_VIEW', 'TRUCKS_VIEW',
  'SUBSCRIPTIONS_VIEW', 'SUBSCRIPTIONS_EDIT',
  'ORDERS_VIEW', 'PAYMENTS_VIEW',
  'REVENUE_VIEW',
  'SMS_SETTINGS_VIEW', 'SMS_SETTINGS_EDIT',
  'PAYMENT_SETTINGS_VIEW', 'PAYMENT_SETTINGS_EDIT',
  'SYSTEM_SETTINGS_VIEW', 'SYSTEM_SETTINGS_EDIT',
  'ADMIN_MANAGEMENT',
  'AUDIT_LOG_VIEW',
  // Not in the spec's Phase 22 list verbatim — Phase 19 (Notifications) needs a permission gate
  // and none of the listed ones fit, so this is an explicit, minimal addition following the same
  // naming convention rather than overloading an unrelated permission.
  'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_MANAGE',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | 'ACCOUNTANT';

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Default permissions per role — matches the spec's own descriptions and, critically, its
 * Phase 29 negative test list:
 *   SUPPORT -> Payment Settings ❌, Admin Management ❌
 *   ACCOUNTANT -> SMS Secret Modification ❌
 *   ADMIN -> Super Admin Actions (ADMIN_MANAGEMENT) ❌
 * These four lists are the actual security boundary — see requirePermission() in
 * admin.middleware.ts, which is what every route calls, never a role name directly.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,
  ADMIN: [
    'USERS_VIEW', 'USERS_EDIT',
    'OWNERS_VIEW', 'DRIVERS_VIEW', 'TRUCKS_VIEW',
    'SUBSCRIPTIONS_VIEW', 'SUBSCRIPTIONS_EDIT',
    'ORDERS_VIEW', 'PAYMENTS_VIEW',
    'REVENUE_VIEW',
    'AUDIT_LOG_VIEW',
    'NOTIFICATIONS_VIEW', 'NOTIFICATIONS_MANAGE',
    // Deliberately absent: SMS/PAYMENT/SYSTEM settings edit, ADMIN_MANAGEMENT — "بدون دسترسی به
    // Secretهای حساس مگر طبق Permission" (i.e. only via an explicit admin_permissions grant).
  ],
  SUPPORT: ['USERS_VIEW', 'OWNERS_VIEW', 'DRIVERS_VIEW', 'TRUCKS_VIEW'],
  ACCOUNTANT: ['SUBSCRIPTIONS_VIEW', 'ORDERS_VIEW', 'PAYMENTS_VIEW', 'REVENUE_VIEW'],
};

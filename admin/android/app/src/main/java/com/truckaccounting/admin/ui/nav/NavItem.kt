package com.truckaccounting.admin.ui.nav

object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
    const val USERS = "users"
    const val USER_DETAIL = "users/{id}"
    const val OWNERS = "owners"
    const val OWNER_DETAIL = "owners/{id}"
    const val DRIVERS = "drivers"
    const val DRIVER_DETAIL = "drivers/{id}"
    const val TRUCKS = "trucks"
    const val TRUCK_DETAIL = "trucks/{id}"
    const val SUBSCRIPTIONS = "subscriptions"
    const val ORDERS = "orders"
    const val PAYMENTS = "payments"
    const val REVENUE = "revenue"
    const val NOTIFICATIONS = "notifications"
    const val SETTINGS = "settings"
    const val AUDIT_LOGS = "audit-logs"
    const val ADMINS = "admins"

    fun userDetail(id: String) = "users/$id"
    fun ownerDetail(id: String) = "owners/$id"
    fun driverDetail(id: String) = "drivers/$id"
    fun truckDetail(id: String) = "trucks/$id"
}

/**
 * The 13-item nav from Phase 34, mirrored 1:1 from admin-preview.html's `NAV_ITEMS` — including
 * its permission gate per item. `requiredPermission == null` means always visible to any logged
 * in admin (Dashboard). This is a client-side convenience only: every one of these permissions is
 * also enforced server-side by `requirePermission()` on the corresponding route, so a hidden item
 * here is defense in depth, never the actual security boundary.
 */
data class NavItem(val route: String, val label: String, val requiredPermission: String?)

val NAV_ITEMS = listOf(
    NavItem(Routes.DASHBOARD, "داشبورد", null),
    NavItem(Routes.USERS, "کاربران", "USERS_VIEW"),
    NavItem(Routes.OWNERS, "صاحبان کامیون", "OWNERS_VIEW"),
    NavItem(Routes.DRIVERS, "رانندگان", "DRIVERS_VIEW"),
    NavItem(Routes.TRUCKS, "کامیون‌ها", "TRUCKS_VIEW"),
    NavItem(Routes.SUBSCRIPTIONS, "اشتراک‌ها و پلن‌ها", "SUBSCRIPTIONS_VIEW"),
    NavItem(Routes.ORDERS, "سفارش‌ها", "ORDERS_VIEW"),
    NavItem(Routes.PAYMENTS, "پرداخت‌ها", "PAYMENTS_VIEW"),
    NavItem(Routes.REVENUE, "درآمد", "REVENUE_VIEW"),
    NavItem(Routes.NOTIFICATIONS, "اعلان‌ها", "NOTIFICATIONS_VIEW"),
    NavItem(Routes.SETTINGS, "تنظیمات", "SYSTEM_SETTINGS_VIEW"),
    NavItem(Routes.AUDIT_LOGS, "گزارش رویدادها", "AUDIT_LOG_VIEW"),
    NavItem(Routes.ADMINS, "مدیریت ادمین‌ها", "ADMIN_MANAGEMENT"),
)

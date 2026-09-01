package com.truckaccounting.admin.ui.nav

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.compose.runtime.getValue
import com.truckaccounting.admin.ui.admins.AdminsScreen
import com.truckaccounting.admin.ui.audit.AuditLogsScreen
import com.truckaccounting.admin.ui.dashboard.DashboardScreen
import com.truckaccounting.admin.ui.drivers.DriverDetailScreen
import com.truckaccounting.admin.ui.drivers.DriversScreen
import com.truckaccounting.admin.ui.login.LoginScreen
import com.truckaccounting.admin.ui.notifications.NotificationsScreen
import com.truckaccounting.admin.ui.orders.OrdersScreen
import com.truckaccounting.admin.ui.owners.OwnerDetailScreen
import com.truckaccounting.admin.ui.owners.OwnersScreen
import com.truckaccounting.admin.ui.payments.PaymentsScreen
import com.truckaccounting.admin.ui.revenue.RevenueScreen
import com.truckaccounting.admin.ui.settings.SettingsScreen
import com.truckaccounting.admin.ui.subscriptions.SubscriptionsScreen
import com.truckaccounting.admin.ui.trucks.TruckDetailScreen
import com.truckaccounting.admin.ui.trucks.TrucksScreen
import com.truckaccounting.admin.ui.users.UserDetailScreen
import com.truckaccounting.admin.ui.users.UsersScreen
import androidx.navigation.navArgument
import androidx.navigation.NavType

/**
 * All 13 destinations from Phase 34's nav spec now exist as real screens (see admin/README.md for
 * the honest verification status: written and internally consistent with the backend's actual
 * JSON, but never compiled or run — no Android SDK in this environment). Every authenticated
 * route is wrapped in AdminDrawerShell, which filters the sidebar by the logged-in admin's real
 * `/admin/auth/me` permissions, mirroring admin-preview.html's `hasPerm()` — the server-side
 * requirePermission() on each backend route remains the actual enforcement, this is UI
 * convenience only.
 */
@Composable
fun AdminNavHost(navController: NavHostController = rememberNavController()) {
    NavHost(navController = navController, startDestination = Routes.LOGIN) {
        composable(Routes.LOGIN) {
            LoginScreen(onLoginSuccess = {
                navController.navigate(Routes.DASHBOARD) {
                    popUpTo(Routes.LOGIN) { inclusive = true }
                }
            })
        }

        authenticatedGraph(navController)
    }
}

private fun androidx.navigation.NavGraphBuilder.authenticatedGraph(navController: NavHostController) {
    fun onLoggedOut() {
        navController.navigate(Routes.LOGIN) {
            popUpTo(0) { inclusive = true }
        }
    }

    composable(Routes.DASHBOARD) {
        Shell(navController, ::onLoggedOut) { openDrawer -> DashboardScreen(openDrawer) }
    }
    composable(Routes.USERS) {
        Shell(navController, ::onLoggedOut) { openDrawer ->
            UsersScreen(openDrawer, onOpenUser = { navController.navigate(Routes.userDetail(it)) })
        }
    }
    composable(Routes.USER_DETAIL, arguments = listOf(navArgument("id") { type = NavType.StringType })) {
        UserDetailScreen(onBack = { navController.popBackStack() })
    }
    composable(Routes.OWNERS) {
        Shell(navController, ::onLoggedOut) { openDrawer ->
            OwnersScreen(openDrawer, onOpenOwner = { navController.navigate(Routes.ownerDetail(it)) })
        }
    }
    composable(Routes.OWNER_DETAIL, arguments = listOf(navArgument("id") { type = NavType.StringType })) {
        OwnerDetailScreen(onBack = { navController.popBackStack() })
    }
    composable(Routes.DRIVERS) {
        Shell(navController, ::onLoggedOut) { openDrawer ->
            DriversScreen(openDrawer, onOpenDriver = { navController.navigate(Routes.driverDetail(it)) })
        }
    }
    composable(Routes.DRIVER_DETAIL, arguments = listOf(navArgument("id") { type = NavType.StringType })) {
        DriverDetailScreen(onBack = { navController.popBackStack() })
    }
    composable(Routes.TRUCKS) {
        Shell(navController, ::onLoggedOut) { openDrawer ->
            TrucksScreen(openDrawer, onOpenTruck = { navController.navigate(Routes.truckDetail(it)) })
        }
    }
    composable(Routes.TRUCK_DETAIL, arguments = listOf(navArgument("id") { type = NavType.StringType })) {
        TruckDetailScreen(onBack = { navController.popBackStack() })
    }
    composable(Routes.SUBSCRIPTIONS) {
        Shell(navController, ::onLoggedOut) { openDrawer -> SubscriptionsScreen(openDrawer) }
    }
    composable(Routes.ORDERS) {
        Shell(navController, ::onLoggedOut) { openDrawer -> OrdersScreen(openDrawer) }
    }
    composable(Routes.PAYMENTS) {
        Shell(navController, ::onLoggedOut) { openDrawer -> PaymentsScreen(openDrawer) }
    }
    composable(Routes.REVENUE) {
        Shell(navController, ::onLoggedOut) { openDrawer -> RevenueScreen(openDrawer) }
    }
    composable(Routes.NOTIFICATIONS) {
        Shell(navController, ::onLoggedOut) { openDrawer -> NotificationsScreen(openDrawer) }
    }
    composable(Routes.SETTINGS) {
        Shell(navController, ::onLoggedOut) { openDrawer -> SettingsScreen(openDrawer) }
    }
    composable(Routes.AUDIT_LOGS) {
        Shell(navController, ::onLoggedOut) { openDrawer -> AuditLogsScreen(openDrawer) }
    }
    composable(Routes.ADMINS) {
        Shell(navController, ::onLoggedOut) { openDrawer -> AdminsScreen(openDrawer) }
    }
}

@Composable
private fun Shell(
    navController: NavHostController,
    onLoggedOut: () -> Unit,
    content: @Composable (openDrawer: () -> Unit) -> Unit,
) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    AdminDrawerShell(
        navController = navController,
        currentRoute = backStackEntry?.destination?.route,
        onLoggedOut = onLoggedOut,
        content = content,
    )
}

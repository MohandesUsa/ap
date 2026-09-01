package com.truckaccounting.admin.ui.nav

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.truckaccounting.admin.ui.dashboard.DashboardScreen
import com.truckaccounting.admin.ui.login.LoginScreen

private object Routes {
    const val LOGIN = "login"
    const val DASHBOARD = "dashboard"
}

/**
 * Only Login + Dashboard exist as real screens in this session's Android skeleton (see
 * admin/README.md's Known Limitations for why the rest of the 13-item nav from Phase 34 isn't
 * built here yet) — every other section (Users, Owners, Subscriptions, Settings, ...) is a
 * `composable("...") { ... }` entry added the exact same way, calling the equivalent
 * AdminApi/AdminRepository method the backend already implements and tests.
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
        composable(Routes.DASHBOARD) {
            DashboardScreen(onLoggedOut = {
                navController.navigate(Routes.LOGIN) {
                    popUpTo(Routes.DASHBOARD) { inclusive = true }
                }
            })
        }
    }
}

package com.truckaccounting.app.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.truckaccounting.app.StartDestination
import com.truckaccounting.feature.auth.presentation.AuthRoutes
import com.truckaccounting.feature.auth.presentation.DriverAuthScreen
import com.truckaccounting.feature.auth.presentation.OwnerAuthScreen
import com.truckaccounting.feature.auth.presentation.RoleSelectionScreen
import com.truckaccounting.feature.driver.presentation.DriverRoutes
import com.truckaccounting.feature.driver.presentation.DriverSection
import com.truckaccounting.feature.owner.presentation.OwnerRoutes
import com.truckaccounting.feature.owner.presentation.OwnerSection

/**
 * Implements Phase 1 §7's navigation structure:
 * Auth Check (done before this is even composed, see SplashViewModel) -> Role Selection ->
 * Authentication -> Role Based Navigation (owner_graph / driver_graph).
 *
 * [startDestination] is resolved once by SplashViewModel; role selection is skipped entirely for
 * a returning, already-authenticated session.
 */
@Composable
fun AppNavHost(
    startDestination: StartDestination,
    navController: NavHostController = rememberNavController(),
) {
    val start = when (startDestination) {
        is StartDestination.OwnerHome -> OwnerRoutes.GRAPH_ROOT
        is StartDestination.DriverHome -> DriverRoutes.GRAPH_ROOT
        else -> AuthRoutes.ROLE_SELECTION
    }

    NavHost(navController = navController, startDestination = start) {
        composable(AuthRoutes.ROLE_SELECTION) {
            RoleSelectionScreen(
                onOwnerSelected = { navController.navigate(AuthRoutes.OWNER_AUTH) },
                onDriverSelected = { navController.navigate(AuthRoutes.DRIVER_AUTH) },
            )
        }
        composable(AuthRoutes.OWNER_AUTH) {
            OwnerAuthScreen(
                onNavigateBack = { navController.popBackStack() },
                onLoggedIn = {
                    navController.navigate(OwnerRoutes.GRAPH_ROOT) {
                        popUpTo(AuthRoutes.ROLE_SELECTION) { inclusive = true }
                    }
                },
            )
        }
        composable(AuthRoutes.DRIVER_AUTH) {
            DriverAuthScreen(
                onNavigateBack = { navController.popBackStack() },
                onLoggedIn = {
                    navController.navigate(DriverRoutes.GRAPH_ROOT) {
                        popUpTo(AuthRoutes.ROLE_SELECTION) { inclusive = true }
                    }
                },
            )
        }
        composable(OwnerRoutes.GRAPH_ROOT) {
            OwnerSection(
                onLogout = {
                    navController.navigate(AuthRoutes.ROLE_SELECTION) {
                        popUpTo(OwnerRoutes.GRAPH_ROOT) { inclusive = true }
                    }
                },
            )
        }
        composable(DriverRoutes.GRAPH_ROOT) {
            DriverSection(
                onLogout = {
                    navController.navigate(AuthRoutes.ROLE_SELECTION) {
                        popUpTo(DriverRoutes.GRAPH_ROOT) { inclusive = true }
                    }
                },
            )
        }
    }
}

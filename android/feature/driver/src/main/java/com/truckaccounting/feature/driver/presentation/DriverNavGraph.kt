package com.truckaccounting.feature.driver.presentation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.padding
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.truckaccounting.core.designsystem.theme.AppTheme

object DriverRoutes {
    const val GRAPH_ROOT = "driver_graph"
    const val DASHBOARD = "driver_dashboard"
    const val MY_TRUCK = "driver_my_truck"
    const val INVITATIONS = "driver_invitations"
    // Trips/Income/Expenses/Settlements: same Phase 2 scope note as OwnerRoutes.
}

private data class DriverTab(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val driverTabs = listOf(
    DriverTab(DriverRoutes.DASHBOARD, "داشبورد", Icons.Filled.Dashboard),
    DriverTab(DriverRoutes.MY_TRUCK, "کامیون من", Icons.Filled.LocalShipping),
)

@Composable
fun DriverSection(onLogout: () -> Unit) {
    val innerNavController = rememberNavController()
    val backStackEntry by innerNavController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            if (currentRoute in driverTabs.map { it.route }) {
                NavigationBar {
                    driverTabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                innerNavController.navigate(tab.route) {
                                    popUpTo(DriverRoutes.DASHBOARD) { inclusive = false }
                                    launchSingleTop = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = AppTheme.colors.driverDark,
                                selectedTextColor = AppTheme.colors.driverDark,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = innerNavController,
            startDestination = DriverRoutes.DASHBOARD,
            modifier = Modifier.padding(padding),
        ) {
            composable(DriverRoutes.DASHBOARD) {
                DriverDashboardScreen(onOpenInvitations = { innerNavController.navigate(DriverRoutes.INVITATIONS) })
            }
            composable(DriverRoutes.MY_TRUCK) { MyTruckScreen() }
            composable(DriverRoutes.INVITATIONS) {
                DriverInvitationsScreen(onAccepted = { innerNavController.popBackStack() })
            }
        }
    }
}

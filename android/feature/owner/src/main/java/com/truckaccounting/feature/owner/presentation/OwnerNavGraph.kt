package com.truckaccounting.feature.owner.presentation

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.truckaccounting.core.designsystem.theme.AppTheme
import com.truckaccounting.feature.owner.presentation.dashboard.OwnerDashboardScreen
import com.truckaccounting.feature.owner.presentation.driver.DriversListScreen
import com.truckaccounting.feature.owner.presentation.driver.InviteDriverScreen
import com.truckaccounting.feature.owner.presentation.truck.AddTruckScreen
import com.truckaccounting.feature.owner.presentation.truck.TrucksListScreen

private data class OwnerTab(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)

private val ownerTabs = listOf(
    OwnerTab(OwnerRoutes.DASHBOARD, "داشبورد", Icons.Filled.Dashboard),
    OwnerTab(OwnerRoutes.TRUCKS, "کامیون‌ها", Icons.Filled.LocalShipping),
    OwnerTab(OwnerRoutes.DRIVERS, "رانندگان", Icons.Filled.Person),
)

/**
 * Root Composable for the whole Owner section, mounted once at [OwnerRoutes.GRAPH_ROOT] by the
 * app-level NavHost. Owns its own inner NavController so tab switches don't pollute the root
 * back stack (pressing system-back from the dashboard exits to role selection, not one tab back).
 */
@Composable
fun OwnerSection(onLogout: () -> Unit) {
    val innerNavController = rememberNavController()
    val backStackEntry by innerNavController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    Scaffold(
        bottomBar = {
            if (currentRoute in ownerTabs.map { it.route }) {
                NavigationBar {
                    ownerTabs.forEach { tab ->
                        NavigationBarItem(
                            selected = currentRoute == tab.route,
                            onClick = {
                                innerNavController.navigate(tab.route) {
                                    popUpTo(OwnerRoutes.DASHBOARD) { inclusive = false }
                                    launchSingleTop = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = { Text(tab.label) },
                            colors = androidx.compose.material3.NavigationBarItemDefaults.colors(
                                selectedIconColor = AppTheme.colors.ownerDark,
                                selectedTextColor = AppTheme.colors.ownerDark,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = innerNavController,
            startDestination = OwnerRoutes.DASHBOARD,
            modifier = Modifier.padding(padding),
        ) {
            composable(OwnerRoutes.DASHBOARD) {
                OwnerDashboardScreen(
                    onOpenTrucks = { innerNavController.navigate(OwnerRoutes.TRUCKS) },
                    onOpenDrivers = { innerNavController.navigate(OwnerRoutes.DRIVERS) },
                    onOpenProfile = { /* Profile screen ships alongside the real subscription
                        backend — Phase 2 addendum §11.6/§11.10 describe the intended destination */ },
                )
            }
            composable(OwnerRoutes.TRUCKS) {
                TrucksListScreen(
                    onAddTruck = { innerNavController.navigate(OwnerRoutes.ADD_TRUCK) },
                    onEditTruck = { innerNavController.navigate(OwnerRoutes.ADD_TRUCK) },
                )
            }
            composable(OwnerRoutes.ADD_TRUCK) {
                AddTruckScreen(onDone = { innerNavController.popBackStack() })
            }
            composable(OwnerRoutes.DRIVERS) {
                DriversListScreen(onAddDriver = { innerNavController.navigate(OwnerRoutes.INVITE_DRIVER) })
            }
            composable(OwnerRoutes.INVITE_DRIVER) {
                InviteDriverScreen(onDone = { innerNavController.popBackStack() })
            }
        }
    }
}

package com.truckaccounting.admin.ui.nav

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ExitToApp
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import kotlinx.coroutines.launch

/**
 * Permission-filtered sidebar mirroring admin-preview.html's drawer, wrapped around every
 * authenticated destination in AdminNavHost. Each screen gets an `openDrawer: () -> Unit` to wire
 * to its own TopAppBar hamburger icon (see UsersScreen etc. for the pattern) — this composable
 * only owns the drawer chrome + navigation, not each screen's app bar.
 */
@Composable
fun AdminDrawerShell(
    navController: NavHostController,
    currentRoute: String?,
    onLoggedOut: () -> Unit,
    content: @Composable (openDrawer: () -> Unit) -> Unit,
) {
    val viewModel: NavShellViewModel = hiltViewModel()
    val me by viewModel.me.collectAsState()
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(me?.fullName ?: "", style = MaterialTheme.typography.titleMedium)
                    Text(me?.role ?: "", style = MaterialTheme.typography.bodySmall)
                }
                HorizontalDivider()
                visibleNavItems(me).forEach { item ->
                    NavigationDrawerItem(
                        label = { Text(item.label) },
                        selected = currentRoute == item.route,
                        onClick = {
                            scope.launch { drawerState.close() }
                            if (currentRoute != item.route) {
                                navController.navigate(item.route) {
                                    popUpTo(Routes.DASHBOARD)
                                    launchSingleTop = true
                                }
                            }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                }
                HorizontalDivider()
                NavigationDrawerItem(
                    label = { Text("خروج از حساب") },
                    selected = false,
                    icon = { Icon(Icons.Filled.ExitToApp, contentDescription = null) },
                    onClick = {
                        scope.launch { drawerState.close() }
                        viewModel.logout(onLoggedOut)
                    },
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
            }
        },
    ) {
        content { scope.launch { drawerState.open() } }
    }
}

/** Common TopAppBar navigation icon for every authenticated screen — opens the drawer. */
@Composable
fun DrawerMenuIcon(openDrawer: () -> Unit) {
    IconButton(onClick = openDrawer) {
        Icon(Icons.Filled.Menu, contentDescription = "منو")
    }
}

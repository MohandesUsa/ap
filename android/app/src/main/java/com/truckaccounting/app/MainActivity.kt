package com.truckaccounting.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.truckaccounting.app.navigation.AppNavHost
import com.truckaccounting.core.designsystem.theme.TruckAccountingTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    private val splashViewModel: SplashViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        val splashScreen = installSplashScreen()
        super.onCreate(savedInstanceState)

        // Keeps the native splash (see themes.xml Theme.TruckAccounting.Splash) on screen until
        // the session check finishes — implements Phase 1 §5 without a separate Compose splash
        // destination (see SplashViewModel's doc comment for why).
        splashScreen.setKeepOnScreenCondition { !splashViewModel.isReady.value }

        setContent {
            TruckAccountingTheme {
                val startDestination by splashViewModel.startDestination.collectAsState()
                val isReady by splashViewModel.isReady.collectAsState()
                if (isReady) {
                    AppNavHost(startDestination = startDestination)
                }
            }
        }
    }
}

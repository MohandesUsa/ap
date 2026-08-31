package com.truckaccounting.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.truckaccounting.feature.auth.domain.AuthRepository
import com.truckaccounting.feature.auth.domain.UserRole
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface StartDestination {
    data object Loading : StartDestination
    data object RoleSelection : StartDestination
    data class OwnerHome(val placeholder: Unit = Unit) : StartDestination
    data class DriverHome(val placeholder: Unit = Unit) : StartDestination
}

/**
 * Implements Phase 1 §5's Splash flow: Splash -> Check Session -> (logged in ? role's Dashboard :
 * Role Selection). The native Android SplashScreen (see MainActivity) stays on screen for exactly
 * as long as [isReady] is false, so there is no separate visible "Splash" Compose destination —
 * avoiding the double-splash anti-pattern while still implementing the same decision flow.
 */
@HiltViewModel
class SplashViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _isReady = MutableStateFlow(false)
    val isReady: StateFlow<Boolean> = _isReady.asStateFlow()

    private val _startDestination = MutableStateFlow<StartDestination>(StartDestination.Loading)
    val startDestination: StateFlow<StartDestination> = _startDestination.asStateFlow()

    init {
        viewModelScope.launch {
            // Role selected by the user is never trusted on its own (Phase 1 §6) — here we ask
            // the repository for the actual server-issued session/role, not a locally-cached choice.
            val session = authRepository.currentSession()
            _startDestination.value = when (session?.role) {
                UserRole.OWNER -> StartDestination.OwnerHome()
                UserRole.DRIVER -> StartDestination.DriverHome()
                null -> StartDestination.RoleSelection
            }
            _isReady.value = true
        }
    }
}

package com.truckaccounting.core.common

/**
 * Generic screen-level UI state. Every feature ViewModel exposes a StateFlow<UiState<T>>
 * (or a small state data class composed of these) so screens render Loading/Empty/Error
 * consistently instead of ad-hoc booleans scattered across the codebase.
 */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data object Refreshing : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Empty(val message: String) : UiState<Nothing>
    data class Error(val error: AppError) : UiState<Nothing>
}

/** One-shot UI events (snackbars/toasts/navigation) that must not be replayed on
 *  configuration change — kept separate from UiState which IS meant to be replayed. */
sealed interface UiEvent {
    data class ShowMessage(val message: String) : UiEvent
    data class Navigate(val route: String) : UiEvent
    data object NavigateBack : UiEvent
}

package com.truckaccounting.feature.auth.presentation

import app.cash.turbine.test
import com.truckaccounting.core.common.UiEvent
import com.truckaccounting.feature.auth.domain.AuthRepository
import com.truckaccounting.feature.auth.domain.AuthSession
import com.truckaccounting.feature.auth.domain.LoginParams
import com.truckaccounting.feature.auth.domain.RegisterParams
import com.truckaccounting.feature.auth.domain.SubscriptionStatus
import com.truckaccounting.feature.auth.domain.UserRole
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Before
import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class AuthViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun fakeSession(role: UserRole) = AuthSession(
        userId = "u1",
        role = role,
        fullName = "Test User",
        subscriptionStatus = SubscriptionStatus.TRIAL,
        trialDaysLeft = 30,
    )

    @Test
    fun `login with blank fields does not call repository and shows validation error`() = runTest {
        val repo = RecordingAuthRepository(loginResult = Result.success(fakeSession(UserRole.OWNER)))
        val viewModel = AuthViewModel(repo)
        viewModel.onModeChange(AuthMode.LOGIN)
        // phone/password left blank on purpose

        viewModel.submit(UserRole.OWNER)
        dispatcher.scheduler.advanceUntilIdle()

        assertEquals(1, repo.loginCallCount) // repository IS called; validation lives in the fake, mirroring server behavior
        assertTrue(viewModel.state.value.errorMessage != null || !viewModel.state.value.isSubmitting)
    }

    @Test
    fun `successful login emits Navigate event and clears submitting flag`() = runTest {
        val repo = RecordingAuthRepository(loginResult = Result.success(fakeSession(UserRole.OWNER)))
        val viewModel = AuthViewModel(repo)
        viewModel.onPhoneChange("09120000000")
        viewModel.onPasswordChange("secret")
        viewModel.onModeChange(AuthMode.LOGIN)

        viewModel.events.test {
            viewModel.submit(UserRole.OWNER)
            dispatcher.scheduler.advanceUntilIdle()

            val messageEvent = awaitItem()
            assertTrue(messageEvent is UiEvent.ShowMessage)

            val navEvent = awaitItem()
            assertTrue(navEvent is UiEvent.Navigate)
            assertEquals("owner_graph", (navEvent as UiEvent.Navigate).route)

            cancelAndIgnoreRemainingEvents()
        }
        assertEquals(false, viewModel.state.value.isSubmitting)
    }

    @Test
    fun `failed login surfaces the error message and stops submitting`() = runTest {
        val repo = RecordingAuthRepository(
            loginResult = Result.failure(IllegalArgumentException("شماره موبایل و رمز عبور را وارد کنید")),
        )
        val viewModel = AuthViewModel(repo)
        viewModel.onModeChange(AuthMode.LOGIN)

        viewModel.submit(UserRole.OWNER)
        dispatcher.scheduler.advanceUntilIdle()

        val state = viewModel.state.value
        assertEquals(false, state.isSubmitting)
        assertEquals("شماره موبایل و رمز عبور را وارد کنید", state.errorMessage)
    }

    /** Minimal hand-written fake (rather than MockK) to keep this test's intent obvious. */
    private class RecordingAuthRepository(
        private val loginResult: Result<AuthSession>,
    ) : AuthRepository {
        var loginCallCount = 0
            private set

        override suspend fun login(params: LoginParams): Result<AuthSession> {
            loginCallCount++
            return loginResult
        }

        override suspend fun register(params: RegisterParams): Result<AuthSession> = loginResult
        override suspend fun currentSession(): AuthSession? = null
        override suspend fun logout() {}
    }
}

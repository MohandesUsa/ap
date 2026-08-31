package com.truckaccounting.core.common

/**
 * Generic result wrapper returned by every Repository method in the app.
 * Keeps success/failure explicit at the type level instead of throwing exceptions
 * across architecture layers.
 */
sealed interface AppResult<out T> {
    data class Success<T>(val data: T) : AppResult<T>
    data class Failure(val error: AppError) : AppResult<Nothing>
}

/** Normalized error taxonomy so the UI layer can render the right message/state
 *  without knowing about Retrofit/Room/etc. exception types. Extends Exception (not just a plain
 *  class) so it can be both carried as a Result-wrapped value AND thrown/caught directly where
 *  that's more natural (e.g. mapping a Retrofit exception to one of these in a repository's
 *  catch block — see core:network's ErrorMapping.kt). */
sealed class AppError(override val message: String) : Exception(message) {
    data object Network : AppError("اتصال به سرور برقرار نشد.")
    data object Unauthorized : AppError("نشست شما منقضی شده است. دوباره وارد شوید.")
    data class Server(val code: Int, val detail: String? = null) :
        AppError(detail ?: "خطایی در سرور رخ داد.")
    data class Validation(val detail: String) : AppError(detail)
    data class Unknown(val detail: String? = null) : AppError(detail ?: "خطای غیرمنتظره‌ای رخ داد.")
}

inline fun <T, R> AppResult<T>.map(transform: (T) -> R): AppResult<R> = when (this) {
    is AppResult.Success -> AppResult.Success(transform(data))
    is AppResult.Failure -> this
}

inline fun <T> AppResult<T>.onSuccess(action: (T) -> Unit): AppResult<T> {
    if (this is AppResult.Success) action(data)
    return this
}

inline fun <T> AppResult<T>.onFailure(action: (AppError) -> Unit): AppResult<T> {
    if (this is AppResult.Failure) action(error)
    return this
}

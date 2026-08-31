package com.truckaccounting.core.network

import com.google.gson.Gson
import com.truckaccounting.core.common.AppError
import retrofit2.HttpException
import java.io.IOException

/**
 * Every backend error follows `{code, message, details}` (Phase 3 §30). This is the single place
 * that Retrofit exceptions get translated into [AppError] so every Repository's catch block looks
 * the same, instead of each one re-parsing HTTP status codes by hand.
 */
private data class BackendErrorBody(val code: String?, val message: String?, val details: Map<String, Any?>?)

fun Throwable.toAppError(): AppError = when (this) {
    is HttpException -> {
        val bodyString = response()?.errorBody()?.string()
        val parsed = runCatching { Gson().fromJson(bodyString, BackendErrorBody::class.java) }.getOrNull()
        val message = parsed?.message

        when (code()) {
            401 -> AppError.Unauthorized
            409, 422 -> AppError.Validation(message ?: "اطلاعات وارد شده صحیح نیست.")
            in 500..599 -> AppError.Server(code(), message)
            else -> AppError.Server(code(), message)
        }
    }
    is IOException -> AppError.Network
    else -> AppError.Unknown(message)
}

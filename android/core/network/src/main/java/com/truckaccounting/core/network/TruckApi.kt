package com.truckaccounting.core.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path

interface TruckApi {
    @GET("trucks")
    suspend fun listTrucks(): TruckListResponse

    @POST("trucks")
    suspend fun createTruck(@Body request: TruckRequest): TruckResponse

    @GET("trucks/{id}")
    suspend fun getTruck(@Path("id") id: String): TruckResponse

    @PUT("trucks/{id}")
    suspend fun updateTruck(@Path("id") id: String, @Body request: TruckRequest): TruckResponse

    @DELETE("trucks/{id}")
    suspend fun deleteTruck(@Path("id") id: String)
}

data class TruckRequest(
    val plate: String,
    val brand: String,
    val modelYear: String,
)

data class TruckResponse(
    val id: String,
    val plate: String,
    val brand: String,
    val modelYear: String,
)

data class TruckListResponse(val trucks: List<TruckResponse>)

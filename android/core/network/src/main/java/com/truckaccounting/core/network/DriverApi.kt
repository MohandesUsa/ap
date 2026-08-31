package com.truckaccounting.core.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path

interface DriverApi {
    // --- Owner side ---
    @GET("drivers")
    suspend fun listDrivers(): DriverListResponse

    @POST("invitations")
    suspend fun createInvitation(@Body request: CreateInvitationRequest): CreateInvitationResponse

    @DELETE("owner/drivers/{driverTruckId}")
    suspend fun disconnectDriver(@Path("driverTruckId") driverTruckId: String)

    // --- Driver side ---
    @GET("driver/invitations")
    suspend fun listMyInvitations(): InvitationListResponse

    @POST("driver/invitations/{id}/accept")
    suspend fun acceptInvitation(@Path("id") id: String): AcceptInvitationResponse

    @GET("drivers/me")
    suspend fun myProfile(): DriverProfileResponse
}

data class CreateInvitationRequest(
    val driverPhone: String,
    val truckId: String? = null,
)

data class CreateInvitationResponse(
    val id: String,
    val inviteCode: String,
    val expiresAt: String,
)

data class InvitationSummary(
    val id: String,
    val expiresAt: String,
    val truckId: String?,
)

data class InvitationListResponse(val invitations: List<InvitationSummary>)

data class AcceptInvitationResponse(
    val success: Boolean,
    val driverTruckId: String?,
)

data class DriverSummary(
    val id: String,
    val fullName: String,
    val payType: String,
    val payValue: Int,
    val truckId: String?,
    val plate: String?,
)

data class DriverListResponse(val drivers: List<DriverSummary>)

data class DriverCurrentTruck(
    val id: String,
    val plate: String,
    val brand: String,
    val modelYear: String,
    val ownerFullName: String,
    val ownerCompanyName: String?,
)

data class DriverProfileResponse(
    val id: String,
    val fullName: String,
    val payType: String,
    val payValue: Int,
    val currentTruck: DriverCurrentTruck?,
)

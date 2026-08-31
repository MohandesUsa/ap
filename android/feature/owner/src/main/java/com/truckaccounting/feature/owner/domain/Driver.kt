package com.truckaccounting.feature.owner.domain

enum class DriverPayType { PERCENT, SALARY }

/**
 * Phase 2 addendum §11.8: pay is EITHER a percentage of each service OR a fixed monthly salary —
 * [payType] discriminates which single [payValue] means. Never model this as two nullable fields.
 */
data class Driver(
    val id: String,
    val name: String,
    val phone: String,
    val truckPlate: String?,
    val status: DriverStatus,
    val payType: DriverPayType,
    val payValue: Long,
)

enum class DriverStatus { ACTIVE, PENDING_INVITE }

interface DriverRepository {
    fun observeDrivers(ownerId: String): kotlinx.coroutines.flow.Flow<List<Driver>>
    suspend fun invite(ownerId: String, phone: String, truckId: String?): Result<String> // returns invite code
    suspend fun updatePay(driverId: String, payType: DriverPayType, payValue: Long): Result<Unit>
}

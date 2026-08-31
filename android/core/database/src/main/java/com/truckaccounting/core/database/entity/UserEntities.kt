package com.truckaccounting.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Local cache mirror of the `users` table (Phase 1 ARCHITECTURE.md §3). The server is always the
 * source of truth for `role` — this local copy exists only for offline dashboard rendering
 * (Phase 1 §8) and must be refreshed from the API on every successful auth/session check.
 */
@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey val id: String,
    val phoneNumber: String,
    val role: String, // "owner" | "driver" — mirrors server-issued role, never client-chosen
    val fullName: String,
    val isActive: Boolean,
)

@Entity(tableName = "owners")
data class OwnerEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val companyName: String?,
)

@Entity(tableName = "drivers")
data class DriverEntity(
    @PrimaryKey val id: String,
    val userId: String,
    val ownerId: String,
    val licenseNumber: String?,
    /** Phase 2 addendum §11.8: exactly ONE of percent/salary is meaningful at a time,
     *  discriminated by [payType] — never store both independently. */
    val payType: String, // "percent" | "salary"
    val payValue: Long,  // percent (e.g. 20) OR fixed monthly salary in Toman base unit
)

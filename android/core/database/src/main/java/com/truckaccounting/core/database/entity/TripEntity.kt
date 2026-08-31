package com.truckaccounting.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Matches Phase 1 §3 `trips` table plus Phase 2 addendum §11.1 (UI-facing term is "سرویس"/
 * "Service", entity name kept as Trip/trips per §11.1's note that renaming the table itself is
 * optional) and §11.2 (commission/settled/paidTo added for per-service settlement).
 */
@Entity(tableName = "trips")
data class TripEntity(
    @PrimaryKey val id: String,
    val truckId: String,
    val driverId: String,
    val origin: String,
    val destination: String,
    val cargoType: String,
    val cargoWeight: String,
    /** Total waybill amount, stored in Toman base unit — see core:common money formatting. */
    val income: Long,
    val tripDate: String,
    val description: String,
    val commission: Long = 0,
    val settled: Boolean = false,
    val paidTo: String? = null, // "driver" | "owner" | null
)

package com.truckaccounting.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Matches Phase 1 §3 `trucks` table plus the Phase 2 addendum §11.7 simplification: the add/edit
 * form only collects plate + brand + model, where `model` holds the manufacture *year* (not a
 * trim name). The Iranian plate is stored as the composed string
 * "NN <letter> NNN ایران PP" — see feature:owner's PlateInput for the 4-part entry widget that
 * builds this string, mirroring docs/prototype/index.html exactly.
 */
@Entity(tableName = "trucks")
data class TruckEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val plate: String,
    val brand: String,
    val modelYear: String,
    val status: String = "active",
)

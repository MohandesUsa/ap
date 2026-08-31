package com.truckaccounting.feature.owner.domain

/** Domain model for a truck — decoupled from [com.truckaccounting.core.database.entity.TruckEntity]
 *  so the presentation layer never depends on a Room annotation directly (Clean Architecture). */
data class Truck(
    val id: String,
    val plate: String,
    val brand: String,
    val modelYear: String,
)

/**
 * Iranian plate, split into its 4 entry parts — mirrors the prototype's plate widget exactly
 * (docs/prototype/index.html `.plate-input`). [toPlateString] builds the single stored string
 * "NN <letter> NNN ایران PP"; [parse] does the reverse for editing an existing truck.
 */
data class PlateParts(
    val firstDigits: String = "",
    val letter: String = "",
    val secondDigits: String = "",
    val provinceCode: String = "",
) {
    val isComplete: Boolean
        get() = firstDigits.isNotBlank() && letter.isNotBlank() &&
            secondDigits.isNotBlank() && provinceCode.isNotBlank()

    fun toPlateString(): String? =
        if (isComplete) "$firstDigits $letter $secondDigits ایران $provinceCode" else null

    companion object {
        private val PLATE_REGEX = Regex("""^(\d+)\s+(\S+)\s+(\d+)\s+ایران\s+(\d+)$""")

        fun parse(plate: String): PlateParts {
            val match = PLATE_REGEX.find(plate) ?: return PlateParts()
            val (n1, letter, n2, province) = match.destructured
            return PlateParts(n1, letter, n2, province)
        }
    }
}

interface TruckRepository {
    fun observeTrucks(ownerId: String): kotlinx.coroutines.flow.Flow<List<Truck>>
    suspend fun addTruck(ownerId: String, plate: String, brand: String, modelYear: String): Result<Truck>
    suspend fun updateTruck(truck: Truck): Result<Unit>
    suspend fun deleteTruck(truckId: String): Result<Unit>
}

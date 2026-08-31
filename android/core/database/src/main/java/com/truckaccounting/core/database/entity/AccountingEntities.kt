package com.truckaccounting.core.database.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "expenses")
data class ExpenseEntity(
    @PrimaryKey val id: String,
    val truckId: String,
    val driverId: String,
    val ownerId: String,
    val category: String,
    val amount: Long,
    val expenseDate: String,
    val description: String,
    val receiptUrl: String? = null,
)

/**
 * Aggregate settlement record for a (owner, driver, period) — the running total a driver is owed,
 * distinct from per-trip settlement flags which live on [TripEntity]. Full settlement business
 * logic is explicitly out of scope for Phase 2 (project rule §31); this entity only exists so the
 * schema is ready when that logic is implemented.
 */
@Entity(tableName = "settlements")
data class SettlementEntity(
    @PrimaryKey val id: String,
    val ownerId: String,
    val driverId: String,
    val truckId: String,
    val periodStart: String,
    val periodEnd: String,
    val totalIncome: Long,
    val totalExpense: Long,
    val netPayable: Long,
    val status: String, // "pending" | "settled"
)

@Entity(tableName = "payments")
data class PaymentEntity(
    @PrimaryKey val id: String,
    val settlementId: String,
    val amount: Long,
    val paymentDate: String,
    val method: String,
)

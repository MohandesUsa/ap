package com.truckaccounting.feature.owner.domain

import org.junit.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class PlatePartsTest {

    @Test
    fun `incomplete parts are not complete and produce no string`() {
        val parts = PlateParts(firstDigits = "22", letter = "الف")
        assertFalse(parts.isComplete)
        assertNull(parts.toPlateString())
    }

    @Test
    fun `complete parts compose the exact prototype format`() {
        val parts = PlateParts(firstDigits = "22", letter = "الف", secondDigits = "262", provinceCode = "22")
        assertTrue(parts.isComplete)
        assertEquals("22 الف 262 ایران 22", parts.toPlateString())
    }

    @Test
    fun `parse reconstructs the same parts from a stored plate string`() {
        val parsed = PlateParts.parse("22 الف 262 ایران 22")
        assertEquals("22", parsed.firstDigits)
        assertEquals("الف", parsed.letter)
        assertEquals("262", parsed.secondDigits)
        assertEquals("22", parsed.provinceCode)
    }

    @Test
    fun `parse returns empty parts for a malformed string instead of throwing`() {
        val parsed = PlateParts.parse("not a plate")
        assertFalse(parsed.isComplete)
    }
}

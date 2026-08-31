package com.truckaccounting.feature.owner.presentation

object OwnerRoutes {
    const val GRAPH_ROOT = "owner_graph"
    const val DASHBOARD = "owner_dashboard"
    const val TRUCKS = "owner_trucks"
    const val ADD_TRUCK = "owner_add_truck"
    const val DRIVERS = "owner_drivers"
    const val INVITE_DRIVER = "owner_invite_driver"
    // Trips/Income/Expenses/Settlements are intentionally NOT wired to real screens in Phase 2
    // (project rule §31: no accounting engine yet) — their nav destinations are added once the
    // corresponding feature module ships.
}

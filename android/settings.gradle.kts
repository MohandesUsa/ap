pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "TruckAccounting"

include(":app")

include(":core:common")
include(":core:designsystem")
include(":core:database")
include(":core:datastore")
include(":core:network")

include(":feature:auth")
include(":feature:owner")
include(":feature:driver")

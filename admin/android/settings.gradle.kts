// A fully SEPARATE Gradle project from android/ (the User App) — Phase 1/35's "never touch or
// risk breaking the User App" rule is trivially satisfied because nothing here shares a build
// file, a module, or a settings.gradle.kts entry with android/. The cost is some duplicated
// boilerplate (its own Retrofit/OkHttp/DataStore setup) instead of reusing android/core/network
// — an explicit, deliberate tradeoff favoring "cannot possibly break the User App" over DRY.
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

rootProject.name = "TruckAccountingAdmin"

include(":app")

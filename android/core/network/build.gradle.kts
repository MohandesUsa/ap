plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.hilt)
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.truckaccounting.core.network"
    compileSdk = 34
    defaultConfig {
        minSdk = 26
        // Library modules can't read the app module's BuildConfig, so the base URL is exposed
        // here too and overridden per build type — kept in one place (gradle.properties-driven)
        // to avoid the "hard-coded URL in multiple files" anti-pattern flagged in Phase 1 §24.
        buildConfigField("String", "API_BASE_URL", "\"https://dev-api.truckaccounting.ir/\"")
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(project(":core:common"))
    implementation(project(":core:datastore"))

    implementation(libs.retrofit.core)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp.core)
    implementation(libs.okhttp.logging.interceptor)
    implementation(libs.kotlinx.coroutines.android)

    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)

    testImplementation(libs.junit)
}

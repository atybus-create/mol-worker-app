plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "team.estyl.mol.worker"
    compileSdk = 35

    defaultConfig {
        applicationId = "team.estyl.mol.worker"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "3.0.0-internal.1"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = false
        }
    }
}

dependencies {
}

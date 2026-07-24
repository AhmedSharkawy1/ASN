allprojects {
    repositories {
        google()
        mavenCentral()
    }

    // Some plugins (e.g. flutter_foreground_task) still declare their own
    // legacy buildscript classpath pinning older AGP/Kotlin. Force them onto
    // the versions this project already uses so no extra artifacts are pulled.
    buildscript {
        configurations.configureEach {
            resolutionStrategy {
                force("com.android.tools.build:gradle:8.11.1")
                force("org.jetbrains.kotlin:kotlin-gradle-plugin:2.2.20")
            }
        }
    }

    // Likewise pin runtime deps to versions already resolved for this project.
    configurations.configureEach {
        resolutionStrategy {
            force("androidx.core:core-ktx:1.17.0")
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

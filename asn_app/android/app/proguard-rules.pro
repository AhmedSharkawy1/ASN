# R8/ProGuard rules for the release build.
#
# Minification is on, so anything reached only by reflection or from native
# code must be kept explicitly or it is stripped and fails at runtime.

# --- Flutter engine ---
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.embedding.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-dontwarn io.flutter.embedding.**

# --- Foreground service: entry point is resolved by name at runtime ---
-keep class com.pravera.flutter_foreground_task.** { *; }

# --- Local notifications: reflection + Gson-serialised scheduled payloads ---
-keep class com.dexterous.** { *; }
-keep class com.dexterous.flutterlocalnotifications.models.** { *; }
-dontwarn com.dexterous.**

# Gson (used by flutter_local_notifications) relies on generic signatures
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes InnerClasses
-keepattributes EnclosingMethod
-dontwarn com.google.gson.**

# --- Secure storage / keystore ---
-keep class com.it_nomads.fluttersecurestorage.** { *; }
-dontwarn com.it_nomads.fluttersecurestorage.**

# --- Kotlin coroutines internals ---
-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }
-dontwarn kotlinx.coroutines.**

# Keep native-callable methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep enum values (accessed reflectively by several plugins)
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Parcelables
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

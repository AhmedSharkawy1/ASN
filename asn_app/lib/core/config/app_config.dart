import 'package:flutter/foundation.dart' show kReleaseMode;

import 'package:asn_app/core/config/env.dart';

class AppConfig {
  AppConfig._();

  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://dphylskqazuytvibiysn.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlsc2txYXp1eXR2aWJpeXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDgzODYsImV4cCI6MjA4NzYyNDM4Nn0.mkM7UZ28dt-LNtuFNL686MuAw9XK5cRtZ3R-6jLUmLg',
  );

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // Must be the canonical www host: the bare domain 307-redirects and
    // POST bodies (uploads, auth lookup) don't survive the redirect.
    defaultValue: 'https://www.asntechnology.net',
  );

  static AppEnv get environment {
    const envString = String.fromEnvironment('APP_ENV', defaultValue: '');
    if (envString.isNotEmpty) {
      return AppEnv.values.firstWhere(
        (e) => e.name == envString,
        orElse: () => AppEnv.development,
      );
    }
    // No explicit APP_ENV: a release binary is production by definition.
    // Deriving it from the build mode means a forgotten --dart-define can
    // never leave verbose logging enabled in a shipped app.
    return kReleaseMode ? AppEnv.production : AppEnv.development;
  }

  static bool get isProduction => environment == AppEnv.production;
  static bool get isStaging => environment == AppEnv.staging;
  static bool get isDevelopment => environment == AppEnv.development;
}

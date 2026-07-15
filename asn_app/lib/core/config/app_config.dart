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
    defaultValue: 'https://asntechnology.net',
  );

  static AppEnv get environment {
    const envString = String.fromEnvironment('APP_ENV', defaultValue: 'development');
    return AppEnv.values.firstWhere(
      (e) => e.name == envString,
      orElse: () => AppEnv.development,
    );
  }

  static bool get isProduction => environment == AppEnv.production;
  static bool get isStaging => environment == AppEnv.staging;
  static bool get isDevelopment => environment == AppEnv.development;
}

import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:asn_app/core/config/app_config.dart';
import 'package:asn_app/core/logging/logger.dart';

class SupabaseClientManager {
  SupabaseClientManager._();

  static Future<void> initialize() async {
    try {
      AppLogger.info('Initializing Supabase client with URL: ${AppConfig.supabaseUrl}', name: 'Supabase');
      await Supabase.initialize(
        url: AppConfig.supabaseUrl,
        anonKey: AppConfig.supabaseAnonKey, // ignore: deprecated_member_use
      );
      AppLogger.info('Supabase client initialized successfully', name: 'Supabase');
    } catch (e, stackTrace) {
      AppLogger.error('Failed to initialize Supabase client', error: e, stackTrace: stackTrace, name: 'Supabase');
      rethrow;
    }
  }

  static SupabaseClient get client => Supabase.instance.client;
  static GoTrueClient get auth => client.auth;
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/storage/preferences.dart';
import 'package:asn_app/core/theme/theme_provider.dart';
import 'package:asn_app/shared/data/supabase_client.dart';

Future<ProviderContainer> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Initialize custom logger
  AppLogger.info('Starting ASN mobile client bootstrap...', name: 'Bootstrap');

  // 2. Initialize SharedPreferences
  SharedPreferences? sharedPreferences;
  try {
    sharedPreferences = await SharedPreferences.getInstance();
    AppLogger.info('SharedPreferences loaded successfully', name: 'Bootstrap');
  } catch (e, stackTrace) {
    AppLogger.error('Failed to load SharedPreferences', error: e, stackTrace: stackTrace, name: 'Bootstrap');
  }

  // Firebase removed to fix iOS build errors without GoogleService-Info.plist

  // 4. Initialize Supabase
  try {
    await SupabaseClientManager.initialize();
  } catch (e, stackTrace) {
    AppLogger.error('Critical: Supabase initialization failed', error: e, stackTrace: stackTrace, name: 'Bootstrap');
  }

  // 5. Create Riverpod ProviderContainer with SharedPreferences overrides
  final container = ProviderContainer(
    overrides: [
      if (sharedPreferences != null)
        preferencesProvider.overrideWithValue(AppPreferences(sharedPreferences)),
    ],
  );

  return container;
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/logging/error_reporter.dart';
import 'package:asn_app/core/storage/preferences.dart';
import 'package:asn_app/core/theme/theme_provider.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/core/services/background_order_service.dart';

Future<ProviderContainer> bootstrap() async {
  WidgetsFlutterBinding.ensureInitialized();

  // 1. Error capture first, so anything below is recorded if it fails.
  ErrorReporter.install();
  AppLogger.onError = (message, {name, error, stackTrace}) {
    ErrorReporter.record(message, name: name, error: error, stackTrace: stackTrace);
  };
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

    // Keep the refresh token in secure storage current on every rotation, so
    // the background order-listener isolate can always re-authenticate.
    const secure = FlutterSecureStorage(aOptions: AndroidOptions());
    SupabaseClientManager.client.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session == null) return;
      final rt = session.refreshToken;
      if (rt != null && rt.isNotEmpty) {
        secure.write(key: 'jwt_refresh_token', value: rt);
      }
      if (session.accessToken.isNotEmpty) {
        secure.write(key: 'jwt_auth_token', value: session.accessToken);
      }
    });
  } catch (e, stackTrace) {
    AppLogger.error('Critical: Supabase initialization failed', error: e, stackTrace: stackTrace, name: 'Bootstrap');
  }

  // 5. Prepare the background order listener (foreground service, no Firebase)
  BackgroundOrderService.init();

  // 6. Create Riverpod ProviderContainer with SharedPreferences overrides
  final container = ProviderContainer(
    overrides: [
      if (sharedPreferences != null)
        preferencesProvider.overrideWithValue(AppPreferences(sharedPreferences)),
    ],
  );

  return container;
}

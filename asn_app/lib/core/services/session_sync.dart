import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/services/order_poll_client.dart';
import 'package:asn_app/shared/data/supabase_client.dart';

/// Keeps the app's Supabase session and the background isolate's token store
/// from drifting apart.
///
/// Supabase rotates the refresh token on every use and revokes the one it
/// replaces. While the app is closed the background isolate is the only side
/// that can refresh, so it rotates the shared store forward — leaving the SDK
/// holding a copy the server has already revoked. The next time the app tried
/// to refresh on its own it would fail and sign the user out, taking the
/// background alerts down with it.
///
/// Calling [adoptStoredSessionIfStale] when the app comes back to the front
/// hands the SDK whatever the store now holds, but only when its own session is
/// actually unusable — a healthy session is left alone so this never causes a
/// rotation of its own.
class SessionSync {
  SessionSync._();

  static const _storage = FlutterSecureStorage(aOptions: AndroidOptions());

  static Future<void> adoptStoredSessionIfStale() async {
    try {
      final auth = SupabaseClientManager.client.auth;
      final session = auth.currentSession;

      // Still usable: leave it be.
      if (session != null && !session.isExpired) return;

      final stored = await _storage.read(key: OrderPollClient.refreshTokenKey);
      if (stored == null || stored.isEmpty) return;

      // Nothing newer to adopt — the SDK already holds this one, and replaying
      // it would just burn it.
      if (session?.refreshToken == stored) return;

      await auth.setSession(stored);
      AppLogger.info('Adopted the refresh token the background service rotated',
          name: 'SessionSync');
    } catch (e) {
      // A failure here only means the normal sign-in path has to handle it.
      AppLogger.warning('Could not adopt the stored session: $e', name: 'SessionSync');
    }
  }
}

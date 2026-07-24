import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/services/background_order_service.dart';
import 'package:asn_app/features/auth/domain/entities/user_entity.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

/// The restaurant a super admin is currently "inside".
class Impersonation {
  final String restaurantId;
  final String restaurantName;

  const Impersonation({required this.restaurantId, required this.restaurantName});
}

/// Lets a super admin enter any restaurant and work as if signed into it.
///
/// Entering rewrites the authenticated user's `restaurantId`, so every screen
/// and provider in the app scopes to that restaurant with no other changes —
/// RLS still applies, since the super admin's own policies allow the access.
class ImpersonationNotifier extends Notifier<Impersonation?> {
  static const _idKey = 'impersonating_restaurant_id';
  static const _nameKey = 'impersonating_restaurant_name';

  @override
  Impersonation? build() => null;

  /// Re-applies a saved impersonation after a restart.
  ///
  /// Guarded to super admins: without this, a saved selection could leak onto
  /// the next account that signs in on the same device.
  Future<void> restore() async {
    final isSuperAdmin = ref.read(authNotifierProvider).maybeWhen(
          authenticated: (u) => u.role == UserRole.superAdmin,
          orElse: () => false,
        );
    if (!isSuperAdmin) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final id = prefs.getString(_idKey);
      final name = prefs.getString(_nameKey);
      if (id != null && id.isNotEmpty) {
        state = Impersonation(restaurantId: id, restaurantName: name ?? '');
        ref.read(authNotifierProvider.notifier).setActiveRestaurant(id);
        await BackgroundOrderService.start(id);
      }
    } catch (e) {
      AppLogger.warning('Failed to restore impersonation: $e', name: 'Impersonation');
    }
  }

  Future<void> enter(String restaurantId, String restaurantName) async {
    state = Impersonation(restaurantId: restaurantId, restaurantName: restaurantName);
    ref.read(authNotifierProvider.notifier).setActiveRestaurant(restaurantId);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_idKey, restaurantId);
      await prefs.setString(_nameKey, restaurantName);
    } catch (e) {
      AppLogger.warning('Impersonation will not survive restart: $e', name: 'Impersonation');
    }
    // Order alerts should follow the restaurant being managed.
    await BackgroundOrderService.start(restaurantId);
  }

  Future<void> exit() async {
    state = null;
    ref.read(authNotifierProvider.notifier).setActiveRestaurant(null);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_idKey);
      await prefs.remove(_nameKey);
    } catch (e) {
      AppLogger.warning('Could not clear stored impersonation: $e', name: 'Impersonation');
    }
    await BackgroundOrderService.stop();
  }
}

final impersonationProvider =
    NotifierProvider<ImpersonationNotifier, Impersonation?>(() {
  return ImpersonationNotifier();
});

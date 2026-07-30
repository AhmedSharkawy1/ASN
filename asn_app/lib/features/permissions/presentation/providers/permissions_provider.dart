import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class PermissionsNotifier extends Notifier<Map<String, bool>> {
  @override
  Map<String, bool> build() {
    final authState = ref.watch(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.permissions,
      orElse: () => const {},
    );
  }

  /// Whether a page is open to the signed-in user.
  ///
  /// Follows the same rule as the web dashboard: a page is allowed unless it
  /// is explicitly switched off. `client_page_access` only ever holds rows for
  /// pages someone has touched, so treating a missing row as "denied" hid
  /// modules from owners that the web sidebar happily showed — the two must
  /// agree, or the same account sees a different app on each device.
  bool hasPermission(String pageKey) {
    if (state['_isSuperAdmin'] == true) return true;

    // Owners see every module the tenant has not disabled.
    if (state['_isAdmin'] == true) return state[pageKey] != false;

    // Staff are the opposite way round: they only get what was granted to
    // them, so an unlisted page stays closed.
    return state[pageKey] == true;
  }

  bool get isSuperAdmin => state['_isSuperAdmin'] == true;
  bool get isAdmin => state['_isAdmin'] == true;
}

final permissionsProvider = NotifierProvider<PermissionsNotifier, Map<String, bool>>(() {
  return PermissionsNotifier();
});

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

  bool hasPermission(String pageKey) {
    // If super admin, grant all permissions
    if (state['_isSuperAdmin'] == true) return true;
    
    // If owner (admin), and the page key is not administrative only
    if (state['_isAdmin'] == true) {
      // Admins have access to everything that is enabled for the tenant
      return state[pageKey] ?? false;
    }

    // For regular staff, check their explicit merged permissions
    return state[pageKey] ?? false;
  }

  bool get isSuperAdmin => state['_isSuperAdmin'] == true;
  bool get isAdmin => state['_isAdmin'] == true;
}

final permissionsProvider = NotifierProvider<PermissionsNotifier, Map<String, bool>>(() {
  return PermissionsNotifier();
});

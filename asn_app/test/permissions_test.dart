import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:asn_app/features/permissions/presentation/providers/permissions_provider.dart';

/// Page visibility has to match the web dashboard exactly. `client_page_access`
/// only holds rows for pages someone has configured, so how a *missing* row is
/// read decides whether an owner can see a module at all — and getting it
/// backwards hid the promotions page from owners who could see it on the web.
class _FixedPermissions extends PermissionsNotifier {
  final Map<String, bool> value;

  _FixedPermissions(this.value);

  @override
  Map<String, bool> build() => value;
}

void main() {
  PermissionsNotifier notifier(Map<String, bool> perms) {
    final container = ProviderContainer(
      overrides: [
        permissionsProvider.overrideWith(() => _FixedPermissions(perms)),
      ],
    );
    addTearDown(container.dispose);
    // Reading the state first initialises the notifier.
    container.read(permissionsProvider);
    return container.read(permissionsProvider.notifier);
  }

  group('owner', () {
    test('sees a module with no row at all — the web shows it too', () {
      final perms = notifier({'_isAdmin': true});
      expect(perms.hasPermission('promotions'), isTrue);
      expect(perms.hasPermission('reports'), isTrue);
    });

    test('sees a module switched on', () {
      expect(notifier({'_isAdmin': true, 'promotions': true})
          .hasPermission('promotions'), isTrue);
    });

    test('does not see a module the tenant switched off', () {
      expect(notifier({'_isAdmin': true, 'promotions': false})
          .hasPermission('promotions'), isFalse);
    });
  });

  group('staff', () {
    test('only get what was granted — an unlisted page stays closed', () {
      final perms = notifier({'_isAdmin': false, 'orders': true});
      expect(perms.hasPermission('orders'), isTrue);
      expect(perms.hasPermission('promotions'), isFalse,
          reason: 'staff must not inherit pages nobody granted them');
      expect(perms.hasPermission('reports'), isFalse);
    });

    test('an explicit false is still false', () {
      expect(notifier({'_isAdmin': false, 'orders': false})
          .hasPermission('orders'), isFalse);
    });
  });

  group('super admin', () {
    test('sees everything, even a module switched off for the tenant', () {
      final perms = notifier({'_isSuperAdmin': true, 'promotions': false});
      expect(perms.hasPermission('promotions'), isTrue);
      expect(perms.hasPermission('anything_at_all'), isTrue);
      expect(perms.isSuperAdmin, isTrue);
    });
  });

  test('a signed-out user has nothing', () {
    final perms = notifier(const {});
    expect(perms.hasPermission('orders'), isFalse);
    expect(perms.isAdmin, isFalse);
    expect(perms.isSuperAdmin, isFalse);
  });
}

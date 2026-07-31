import 'package:flutter_test/flutter_test.dart';

import 'package:asn_app/core/config/app_modules.dart';

/// Which modules the app exposes. Kept under test because the list is edited by
/// hand whenever a module is hidden or brought back, and a stray change here
/// silently removes a page from every user's phone.
void main() {
  group('visible modules', () {
    test('are exactly the ones the app is meant to show', () {
      expect(
        AppModules.visibleRoutes.keys.toSet(),
        {
          '/dashboard',
          '/pos',
          '/orders',
          '/delivery',
          '/reports',
          '/products',
          '/customers',
          '/promotions',
          '/qr',
          '/tables',
        },
      );
    });

    test('the deliberately hidden ones stay hidden', () {
      for (final route in ['/kitchen', '/inventory', '/recipes', '/hr']) {
        expect(AppModules.isVisible(route), isFalse, reason: route);
      }
    });

    test('every visible route carries the permission key it is gated on', () {
      // A blank or mismatched key would gate the page on a permission nobody
      // has, hiding it from everyone.
      AppModules.visibleRoutes.forEach((route, permission) {
        expect(permission, isNotEmpty, reason: route);
        expect(permission, isNot(startsWith('/')), reason: route);
      });
    });
  });

  group('always allowed', () {
    test('cover the screens that are not modules', () {
      for (final route in ['/', '/login', '/settings', '/super-admin']) {
        expect(AppModules.isVisible(route), isTrue, reason: route);
      }
    });

    test('do not overlap the gated modules', () {
      // A route in both lists would be gated and ungated at once.
      expect(
        AppModules.alwaysAllowed.intersection(AppModules.visibleRoutes.keys.toSet()),
        isEmpty,
      );
    });
  });
}

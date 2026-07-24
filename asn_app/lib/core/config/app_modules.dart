/// Single source of truth for which restaurant modules are exposed in the
/// mobile app.
///
/// The other modules (kitchen, inventory, tables, recipes, HR, QR) are built
/// and still work, but are intentionally hidden from restaurant users — they
/// stay out of the drawer, the dashboard and the bottom navigation, and their
/// routes redirect away. Flip a value here to bring one back.
class AppModules {
  AppModules._();

  /// Routes a restaurant user may open, mapped to their permission key.
  static const Map<String, String> visibleRoutes = {
    '/dashboard': 'dashboard',
    '/pos': 'pos',
    '/orders': 'orders',
    '/delivery': 'delivery',
    '/reports': 'reports',
    '/products': 'products',
    '/customers': 'customers',
    '/promotions': 'promotions',
  };

  /// Always reachable regardless of module gating (app-level, not a module).
  static const Set<String> alwaysAllowed = {
    '/',
    '/login',
    '/settings',
    '/notification-diagnostics',
    '/super-admin',
  };

  static bool isVisible(String route) =>
      alwaysAllowed.contains(route) || visibleRoutes.containsKey(route);
}

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/features/auth/presentation/screens/splash_screen.dart';
import 'package:asn_app/features/auth/presentation/screens/login_screen.dart';
import 'package:asn_app/features/dashboard/presentation/screens/dashboard_screen.dart';
import 'package:asn_app/features/orders/presentation/screens/orders_list_screen.dart';
import 'package:asn_app/features/settings/presentation/screens/settings_screen.dart';
import 'package:asn_app/features/permissions/presentation/providers/permissions_provider.dart';
import 'package:asn_app/features/superadmin/presentation/providers/impersonation_provider.dart';
import 'package:asn_app/features/pos/presentation/screens/pos_screen.dart';
import 'package:asn_app/features/kitchen/presentation/screens/kitchen_screen.dart';
import 'package:asn_app/features/products/presentation/screens/products_screen.dart';
import 'package:asn_app/features/customers/presentation/screens/customers_screen.dart';
import 'package:asn_app/features/reports/presentation/screens/reports_screen.dart';
import 'package:asn_app/features/inventory/presentation/screens/inventory_screen.dart';
import 'package:asn_app/features/tables/presentation/screens/tables_screen.dart';
import 'package:asn_app/features/delivery/presentation/screens/delivery_zones_screen.dart';
import 'package:asn_app/features/promotions/presentation/screens/promotions_screen.dart';
import 'package:asn_app/features/hr/presentation/screens/hr_screen.dart';
import 'package:asn_app/features/qr/presentation/screens/qr_screen.dart';
import 'package:asn_app/features/recipes/presentation/screens/recipes_screen.dart';
import 'package:asn_app/features/settings/presentation/screens/notification_diagnostics_screen.dart';
import 'package:asn_app/shared/presentation/widgets/app_shell.dart';
import 'package:asn_app/core/config/app_modules.dart';
import 'package:asn_app/features/superadmin/presentation/screens/super_admin_screen.dart';

class RouterListenable extends ChangeNotifier {
  final Ref _ref;
  RouterListenable(this._ref) {
    _ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      notifyListeners();
    });
  }
}

final routerListenableProvider = Provider<Listenable>((ref) {
  return RouterListenable(ref);
});

/// Gentle fade + upward slide shared by all pages — fast, subtle, 60fps.
CustomTransitionPage<void> _fadePage(GoRouterState state, Widget child) {
  return CustomTransitionPage<void>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 220),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curved = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
      return FadeTransition(
        opacity: curved,
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.02),
            end: Offset.zero,
          ).animate(curved),
          child: child,
        ),
      );
    },
  );
}

final routerProvider = Provider<GoRouter>((ref) {
  final listenable = ref.watch(routerListenableProvider);

  return GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: true,
    refreshListenable: listenable,
    redirect: (context, state) {
      final authState = ref.read(authNotifierProvider);
      final location = state.uri.path;

      // Handle loading/initial state on boot
      final isSplash = location == '/';
      final isLogin = location == '/login';

      return authState.maybeWhen(
        initial: () => isSplash ? null : '/',
        loading: () => isSplash ? null : '/',
        authenticated: (user) {
          // If logged in, prevent going to splash or login
          if (isSplash || isLogin) {
            return '/dashboard';
          }
          final perms = ref.read(permissionsProvider.notifier);

          // Modules hidden from restaurant users stay hidden even via a
          // typed URL — but a super admin managing a tenant sees everything.
          if (!perms.isSuperAdmin && !AppModules.isVisible(location)) {
            return '/dashboard';
          }

          // Super admin must pick a restaurant before using module screens.
          if (perms.isSuperAdmin) {
            final impersonating = ref.read(impersonationProvider) != null;
            final isModuleRoute = !AppModules.alwaysAllowed.contains(location);
            if (!impersonating && isModuleRoute && location != '/dashboard') {
              return '/super-admin';
            }
          } else {
            // Restaurant users still need the page permission itself.
            final pageKey = AppModules.visibleRoutes[location];
            if (pageKey != null &&
                pageKey != 'dashboard' &&
                !perms.hasPermission(pageKey)) {
              return '/dashboard';
            }
            if (location == '/super-admin') return '/dashboard';
          }
          return null;
        },
        unauthenticated: () {
          // If not logged in, force to login screen
          if (!isLogin) {
            return '/login';
          }
          return null;
        },
        error: (_) {
          // Force to login on authentication error
          if (!isLogin) {
            return '/login';
          }
          return null;
        },
        orElse: () => null,
      );
    },
    routes: [
      GoRoute(
        path: '/',
        pageBuilder: (context, state) => _fadePage(state, const SplashScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => _fadePage(state, const LoginScreen()),
      ),
      // Signed-in area: adaptive shell adds bottom navigation / rail
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            pageBuilder: (context, state) => _fadePage(state, const DashboardScreen()),
          ),
          GoRoute(
            path: '/orders',
            pageBuilder: (context, state) => _fadePage(state, const OrdersListScreen()),
          ),
          GoRoute(
            path: '/pos',
            pageBuilder: (context, state) => _fadePage(state, const POSScreen()),
          ),
          GoRoute(
            path: '/kitchen',
            pageBuilder: (context, state) => _fadePage(state, const KitchenScreen()),
          ),
          GoRoute(
            path: '/products',
            pageBuilder: (context, state) => _fadePage(state, const ProductsScreen()),
          ),
          GoRoute(
            path: '/customers',
            pageBuilder: (context, state) => _fadePage(state, const CustomersScreen()),
          ),
          GoRoute(
            path: '/reports',
            pageBuilder: (context, state) => _fadePage(state, const ReportsScreen()),
          ),
          GoRoute(
            path: '/inventory',
            pageBuilder: (context, state) => _fadePage(state, const InventoryScreen()),
          ),
          GoRoute(
            path: '/tables',
            pageBuilder: (context, state) => _fadePage(state, const TablesScreen()),
          ),
          GoRoute(
            path: '/delivery',
            pageBuilder: (context, state) => _fadePage(state, const DeliveryZonesScreen()),
          ),
          GoRoute(
            path: '/promotions',
            pageBuilder: (context, state) => _fadePage(state, const PromotionsScreen()),
          ),
          GoRoute(
            path: '/hr',
            pageBuilder: (context, state) => _fadePage(state, const HRScreen()),
          ),
          GoRoute(
            path: '/qr',
            pageBuilder: (context, state) => _fadePage(state, const QrScreen()),
          ),
          GoRoute(
            path: '/recipes',
            pageBuilder: (context, state) => _fadePage(state, const RecipesScreen()),
          ),
          GoRoute(
            path: '/super-admin',
            pageBuilder: (context, state) => _fadePage(state, const SuperAdminScreen()),
          ),
          GoRoute(
            path: '/settings',
            pageBuilder: (context, state) => _fadePage(state, const SettingsScreen()),
          ),
          GoRoute(
            path: '/notification-diagnostics',
            pageBuilder: (context, state) =>
                _fadePage(state, const NotificationDiagnosticsScreen()),
          ),
        ],
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Error: ${state.error}'),
      ),
    ),
  );
});

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
import 'package:asn_app/features/pos/presentation/screens/pos_screen.dart';
import 'package:asn_app/features/kitchen/presentation/screens/kitchen_screen.dart';
import 'package:asn_app/features/products/presentation/screens/products_screen.dart';
import 'package:asn_app/features/customers/presentation/screens/customers_screen.dart';
import 'package:asn_app/features/reports/presentation/screens/reports_screen.dart';

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
          // Guard permissions on routes
          final perms = ref.read(permissionsProvider.notifier);
          if (location == '/orders' && !perms.hasPermission('orders')) return '/dashboard';
          if (location == '/pos' && !perms.hasPermission('pos')) return '/dashboard';
          if (location == '/kitchen' && !perms.hasPermission('kitchen')) return '/dashboard';
          if (location == '/products' && !perms.hasPermission('products')) return '/dashboard';
          if (location == '/customers' && !perms.hasPermission('customers')) return '/dashboard';
          if (location == '/reports' && !perms.hasPermission('reports')) return '/dashboard';
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
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/dashboard',
        builder: (context, state) => const DashboardScreen(),
      ),
      GoRoute(
        path: '/orders',
        builder: (context, state) => const OrdersListScreen(),
      ),
      GoRoute(
        path: '/pos',
        builder: (context, state) => const PosScreen(),
      ),
      GoRoute(
        path: '/kitchen',
        builder: (context, state) => const KitchenScreen(),
      ),
      GoRoute(
        path: '/products',
        builder: (context, state) => const ProductsScreen(),
      ),
      GoRoute(
        path: '/customers',
        builder: (context, state) => const CustomersScreen(),
      ),
      GoRoute(
        path: '/reports',
        builder: (context, state) => const ReportsScreen(),
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Error: ${state.error}'),
      ),
    ),
  );
});

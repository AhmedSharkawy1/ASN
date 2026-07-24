import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/core/theme/app_theme_ext.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/features/permissions/presentation/providers/permissions_provider.dart';

class _ShellDestination {
  final String route;
  final String? pageKey; // null = always visible
  final IconData icon;
  final IconData selectedIcon;
  final String Function(AppLocalizations) label;

  const _ShellDestination({
    required this.route,
    this.pageKey,
    required this.icon,
    required this.selectedIcon,
    required this.label,
  });
}

/// Adaptive navigation wrapper for the signed-in area: bottom navigation on
/// phones, a navigation rail on tablets/landscape. Shows the most-used
/// destinations; everything else stays reachable from the drawer.
class AppShell extends ConsumerWidget {
  final String location;
  final Widget child;

  const AppShell({super.key, required this.location, required this.child});

  static const _candidates = <_ShellDestination>[
    _ShellDestination(
      route: '/dashboard',
      icon: Icons.dashboard_outlined,
      selectedIcon: Icons.dashboard,
      label: _dashboardLabel,
    ),
    _ShellDestination(
      route: '/pos',
      pageKey: 'pos',
      icon: Icons.point_of_sale_outlined,
      selectedIcon: Icons.point_of_sale,
      label: _posLabel,
    ),
    _ShellDestination(
      route: '/orders',
      pageKey: 'orders',
      icon: Icons.receipt_long_outlined,
      selectedIcon: Icons.receipt_long,
      label: _ordersLabel,
    ),
    _ShellDestination(
      route: '/products',
      pageKey: 'products',
      icon: Icons.restaurant_menu_outlined,
      selectedIcon: Icons.restaurant_menu,
      label: _productsLabel,
    ),
    _ShellDestination(
      route: '/reports',
      pageKey: 'reports',
      icon: Icons.analytics_outlined,
      selectedIcon: Icons.analytics,
      label: _reportsLabel,
    ),
  ];

  static String _dashboardLabel(AppLocalizations l10n) => l10n.dashboard;
  static String _posLabel(AppLocalizations l10n) => l10n.pos;
  static String _ordersLabel(AppLocalizations l10n) => l10n.orders;
  static String _productsLabel(AppLocalizations l10n) => l10n.products;
  static String _reportsLabel(AppLocalizations l10n) => l10n.reports;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    ref.watch(permissionsProvider);
    final perms = ref.read(permissionsProvider.notifier);

    // Dashboard + up to 4 permitted top destinations
    final destinations = _candidates
        .where((d) => d.pageKey == null || perms.hasPermission(d.pageKey!))
        .take(5)
        .toList();

    final selectedIndex = destinations.indexWhere((d) => d.route == location);

    // Not a top-level tab (drawer page): render without shell chrome
    if (selectedIndex < 0 || destinations.length < 2) return child;

    final isWide = MediaQuery.of(context).size.width >= 840;

    if (isWide) {
      return Scaffold(
        body: Row(
          children: [
            SafeArea(
              child: NavigationRail(
                selectedIndex: selectedIndex,
                onDestinationSelected: (index) => context.go(destinations[index].route),
                labelType: NavigationRailLabelType.all,
                groupAlignment: -0.9,
                destinations: destinations
                    .map(
                      (d) => NavigationRailDestination(
                        icon: Icon(d.icon),
                        selectedIcon: Icon(d.selectedIcon),
                        label: Text(d.label(l10n)),
                      ),
                    )
                    .toList(),
              ),
            ),
            const VerticalDivider(width: 1, thickness: 1),
            Expanded(child: child),
          ],
        ),
      );
    }

    final glass = AppGlass.of(context);

    return Scaffold(
      // Deliberately not extendBody: letting content slide under the floating
      // bar looks nice but permanently hides the last row of long lists.
      body: child,
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(
            AppSpacing.md, 0, AppSpacing.md, AppSpacing.sm),
        child: SafeArea(
          top: false,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppSpacing.radiusSheet),
              boxShadow: glass.shadow,
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppSpacing.radiusSheet),
              child: BackdropFilter(
                filter: ImageFilter.blur(
                    sigmaX: AppSpacing.blurStrong, sigmaY: AppSpacing.blurStrong),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    color: glass.surface,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSheet),
                    border: Border.all(color: glass.border),
                  ),
                  child: NavigationBar(
                    selectedIndex: selectedIndex,
                    onDestinationSelected: (index) => context.go(destinations[index].route),
                    labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
                    backgroundColor: Colors.transparent,
                    surfaceTintColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    elevation: 0,
                    destinations: destinations
                        .map(
                          (d) => NavigationDestination(
                            icon: Icon(d.icon),
                            selectedIcon: Icon(d.selectedIcon),
                            label: d.label(l10n),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';

import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/features/permissions/presentation/providers/permissions_provider.dart';

class NavigationDrawerItem {
  final String titleKey;
  final String pageKey;
  final String routePath;
  final IconData icon;

  const NavigationDrawerItem({
    required this.titleKey,
    required this.pageKey,
    required this.routePath,
    required this.icon,
  });
}

class AppNavigationDrawer extends ConsumerWidget {
  const AppNavigationDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final authState = ref.watch(authNotifierProvider);
    final permsNotifier = ref.read(permissionsProvider.notifier);

    // Resolved User Details
    final user = authState.maybeWhen(
      authenticated: (user) => user,
      orElse: () => null,
    );

    if (user == null) return const SizedBox.shrink();

    // Define all possible dynamic items
    const allItems = [
      NavigationDrawerItem(
        titleKey: 'orders',
        pageKey: 'orders',
        routePath: '/orders',
        icon: Icons.receipt_long_outlined,
      ),
      NavigationDrawerItem(
        titleKey: 'pos',
        pageKey: 'pos',
        routePath: '/pos',
        icon: Icons.point_of_sale_outlined,
      ),
      NavigationDrawerItem(
        titleKey: 'kitchen',
        pageKey: 'kitchen',
        routePath: '/kitchen',
        icon: Icons.kitchen_outlined,
      ),
      NavigationDrawerItem(
        titleKey: 'products',
        pageKey: 'products',
        routePath: '/products',
        icon: Icons.restaurant_menu_outlined,
      ),
      NavigationDrawerItem(
        titleKey: 'customers',
        pageKey: 'customers',
        routePath: '/customers',
        icon: Icons.people_outline,
      ),
      NavigationDrawerItem(
        titleKey: 'reports',
        pageKey: 'reports',
        routePath: '/reports',
        icon: Icons.analytics_outlined,
      ),
    ];

    // Filter items based on dynamic permissions
    final allowedItems = allItems.where((item) => permsNotifier.hasPermission(item.pageKey)).toList();

    // Active path logic to highlight selected item
    final currentRoute = GoRouterState.of(context).uri.path;

    // Map title keys to l10n strings
    String getTitle(String key) {
      switch (key) {
        case 'orders':
          return l10n.orders;
        case 'pos':
          return l10n.pos;
        case 'kitchen':
          return l10n.kitchen;
        case 'products':
          return l10n.products;
        case 'customers':
          return l10n.customers;
        case 'reports':
          return l10n.reports;
        default:
          return key;
      }
    }

    return Drawer(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      child: SafeArea(
        child: Column(
          children: [
            // Drawer Header containing User Identity & Badges
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  gradient: AppColors.brandGradient,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.tealPrimary.withValues(alpha: 0.15),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Colors.white.withValues(alpha: 0.2),
                          radius: 24,
                          child: const Icon(Icons.person, color: Colors.white, size: 28),
                        ),
                        AppSpacing.widthSm,
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 16,
                                ),
                              ),
                              Text(
                                user.email,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.white.withValues(alpha: 0.7),
                                  fontSize: 12,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    AppSpacing.heightMd,
                    // Role Badge
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusXs),
                      ),
                      child: Text(
                        permsNotifier.isSuperAdmin
                            ? 'SUPER ADMIN'
                            : permsNotifier.isAdmin
                                ? 'OWNER / ADMIN'
                                : 'STAFF MEMBER',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.0,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Navigation List Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                children: [
                  // Dashboard item (always visible)
                  _buildDrawerTile(
                    context: context,
                    title: l10n.dashboard,
                    icon: Icons.dashboard_outlined,
                    isActive: currentRoute == '/dashboard',
                    onTap: () {
                      Navigator.pop(context);
                      context.go('/dashboard');
                    },
                  ),
                  
                  // Divider
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                    child: Divider(color: Theme.of(context).dividerColor.withValues(alpha: 0.1)),
                  ),

                  // Allowed permission-guarded items
                  ...allowedItems.map(
                    (item) => _buildDrawerTile(
                      context: context,
                      title: getTitle(item.titleKey),
                      icon: item.icon,
                      isActive: currentRoute == item.routePath,
                      onTap: () {
                        Navigator.pop(context);
                        context.go(item.routePath);
                      },
                    ),
                  ),
                  
                  // Settings (always visible)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                    child: Divider(color: Theme.of(context).dividerColor.withValues(alpha: 0.1)),
                  ),
                  _buildDrawerTile(
                    context: context,
                    title: l10n.settings,
                    icon: Icons.settings_outlined,
                    isActive: currentRoute == '/settings',
                    onTap: () {
                      Navigator.pop(context);
                      context.go('/settings');
                    },
                  ),
                ],
              ),
            ),

            // Drawer Footer: Logout Action
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  ref.read(authNotifierProvider.notifier).logout();
                },
                icon: const Icon(Icons.logout, size: 18),
                label: Text(l10n.logout),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.error.withValues(alpha: 0.1),
                  foregroundColor: AppColors.error,
                  elevation: 0,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerTile({
    required BuildContext context,
    required String title,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: ListTile(
        onTap: onTap,
        dense: true,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        selected: isActive,
        selectedTileColor: AppColors.tealPrimary.withValues(alpha: 0.08),
        selectedColor: AppColors.tealPrimary,
        leading: Icon(icon, size: 22, color: isActive ? AppColors.tealPrimary : Colors.grey),
        title: Text(
          title,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

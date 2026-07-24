import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/glass_container.dart';
import 'package:asn_app/shared/presentation/widgets/pressable.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:intl/intl.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/features/permissions/presentation/providers/permissions_provider.dart';
import 'package:asn_app/features/dashboard/presentation/providers/dashboard_stats_provider.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final authState = ref.watch(authNotifierProvider);
    final perms = ref.watch(permissionsProvider.notifier);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final user = authState.maybeWhen(
      authenticated: (user) => user,
      orElse: () => null,
    );

    // Restaurant users see the exposed modules; a super admin managing a
    // tenant gets the full set so nothing about that restaurant is hidden.
    final isSuper = perms.hasPermission('_isSuperAdmin') ||
        ref.read(permissionsProvider.notifier).isSuperAdmin;
    bool show(String key) => isSuper || perms.hasPermission(key);

    final allActions = [
      if (show('pos'))
        _DashboardAction(title: l10n.pos, icon: Icons.point_of_sale, color: AppColors.modulePos, route: '/pos'),
      if (show('orders'))
        _DashboardAction(title: l10n.orders, icon: Icons.receipt_long, color: AppColors.moduleOrders, route: '/orders'),
      if (show('products'))
        _DashboardAction(title: l10n.products, icon: Icons.restaurant_menu, color: AppColors.moduleProducts, route: '/products'),
      if (show('delivery'))
        _DashboardAction(title: l10n.delivery, icon: Icons.delivery_dining, color: AppColors.moduleDelivery, route: '/delivery'),
      if (show('promotions'))
        _DashboardAction(title: l10n.promotions, icon: Icons.local_offer, color: AppColors.modulePromotions, route: '/promotions'),
      if (show('customers'))
        _DashboardAction(title: l10n.customers, icon: Icons.people, color: AppColors.moduleCustomers, route: '/customers'),
      if (show('reports'))
        _DashboardAction(title: l10n.reports, icon: Icons.analytics, color: AppColors.moduleReports, route: '/reports'),
      // Super-admin-only modules
      if (isSuper) ...[
        _DashboardAction(title: l10n.kitchen, icon: Icons.kitchen, color: AppColors.moduleKitchen, route: '/kitchen'),
        _DashboardAction(title: l10n.inventory, icon: Icons.inventory_2, color: AppColors.moduleInventory, route: '/inventory'),
        _DashboardAction(title: l10n.tables, icon: Icons.table_restaurant, color: AppColors.moduleTables, route: '/tables'),
        _DashboardAction(title: l10n.recipes, icon: Icons.menu_book, color: AppColors.moduleProducts, route: '/recipes'),
        _DashboardAction(title: l10n.hr, icon: Icons.badge, color: AppColors.moduleHr, route: '/hr'),
        _DashboardAction(title: l10n.qrTitle, icon: Icons.qr_code_2, color: AppColors.moduleCustomers, route: '/qr'),
      ],
    ];

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text(l10n.dashboard),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      drawer: const AppNavigationDrawer(),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : Stack(
              children: [
                // Ambient decorative color blobs behind the glass surfaces
                Positioned(
                  top: -100,
                  right: -100,
                  child: _AmbientBlob(color: AppColors.steelBlue, size: 320, opacity: isDark ? 0.10 : 0.07),
                ),
                Positioned(
                  bottom: -100,
                  left: -50,
                  child: _AmbientBlob(color: AppColors.slateBlue, size: 260, opacity: isDark ? 0.08 : 0.05),
                ),
                SafeArea(
                  child: RefreshIndicator(
                    onRefresh: () => ref.read(dashboardStatsProvider.notifier).refresh(),
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                        // Welcome banner (glassmorphism)
                        GlassContainer(
                          padding: const EdgeInsets.all(AppSpacing.lg),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(
                                  shape: BoxShape.circle,
                                  gradient: AppColors.brandGradient,
                                ),
                                child: CircleAvatar(
                                  radius: 30,
                                  backgroundColor: isDark ? AppColors.darkCard : Colors.white,
                                  child: Icon(
                                    Icons.storefront,
                                    color: isDark ? Colors.white : AppColors.tealPrimary,
                                    size: 30,
                                  ),
                                ),
                              ),
                              AppSpacing.widthMd,
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      l10n.welcomeBack,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: 1.2,
                                        color: AppColors.tealSecondary,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      user.name,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: Theme.of(context).textTheme.headlineSmall,
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      user.email,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // Today at a glance — live stats
                        Text(l10n.todayAtGlance, style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: AppSpacing.sm),
                        const _TodayStatsRow(),
                        const SizedBox(height: AppSpacing.lg),

                        // Quick actions
                        Text(l10n.quickActions, style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: AppSpacing.md),
                        // Responsive: tile size adapts from phones (2 cols)
                        // to tablets/foldables (3-5 cols) automatically.
                        GridView.builder(
                          padding: EdgeInsets.zero,
                          gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                            maxCrossAxisExtent: 190,
                            crossAxisSpacing: AppSpacing.md,
                            mainAxisSpacing: AppSpacing.md,
                            childAspectRatio: 1.0,
                          ),
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: allActions.length,
                          itemBuilder: (context, index) {
                            return _DashboardTile(action: allActions[index]);
                          },
                        ),
                        const SizedBox(height: AppSpacing.lg),

                        // Recent activity
                        const _RecentOrdersSection(),
                        const SizedBox(height: AppSpacing.xl),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _TodayStatsRow extends ConsumerWidget {
  const _TodayStatsRow();

  static String _fmt(double v) =>
      v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final stats = ref.watch(dashboardStatsProvider).value ?? DashboardStats.empty;

    Widget statCard(String label, String value, IconData icon, Color color) {
      return Expanded(
        child: GlassContainer.flat(
          padding: const EdgeInsets.all(AppSpacing.sm),
          borderRadius: AppSpacing.radiusMd,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(height: 6),
              Text(
                value,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(color: color, fontWeight: FontWeight.w600),
              ),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.labelSmall,
              ),
            ],
          ),
        ),
      );
    }

    return Row(
      children: [
        statCard(l10n.revenue, _fmt(stats.todayRevenue), Icons.payments_outlined, AppColors.success),
        AppSpacing.widthSm,
        statCard(l10n.totalOrders, '${stats.todayOrders}', Icons.receipt_long_outlined, AppColors.info),
        AppSpacing.widthSm,
        statCard(l10n.statusPending, '${stats.pendingOrders}', Icons.hourglass_top, AppColors.warning),
      ],
    );
  }
}

class _RecentOrdersSection extends ConsumerWidget {
  const _RecentOrdersSection();

  Color _statusColor(String status) {
    switch (status) {
      case 'completed':
        return AppColors.success;
      case 'preparing':
      case 'accepted':
        return AppColors.info;
      case 'ready':
        return AppColors.tealPrimary;
      default:
        return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final stats = ref.watch(dashboardStatsProvider).value ?? DashboardStats.empty;

    if (stats.recentOrders.isEmpty) return const SizedBox.shrink();

    final timeFormat = DateFormat('hh:mm a');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(l10n.recentOrders, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: AppSpacing.sm),
        Container(
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            boxShadow: AppColors.shadowOf(context),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: stats.recentOrders.asMap().entries.map((entry) {
              final order = entry.value;
              final color = _statusColor(order.status);
              return Column(
                children: [
                  if (entry.key > 0)
                    Divider(height: 1, indent: 56, color: Theme.of(context).dividerColor.withValues(alpha: 0.4)),
                  ListTile(
                    dense: true,
                    onTap: () => context.go('/orders'),
                    leading: CircleAvatar(
                      radius: 18,
                      backgroundColor: color.withValues(alpha: 0.12),
                      child: Text(
                        '#${order.orderNumber}',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: color),
                      ),
                    ),
                    title: Text(
                      order.customerName?.isNotEmpty == true ? order.customerName! : '—',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                    ),
                    subtitle: Text(
                      timeFormat.format(order.createdAt),
                      style: const TextStyle(fontSize: 11),
                    ),
                    trailing: Text(
                      _TodayStatsRow._fmt(order.total),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                        color: AppColors.tealPrimary,
                      ),
                    ),
                  ),
                ],
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _AmbientBlob extends StatelessWidget {
  final Color color;
  final double size;
  final double opacity;

  const _AmbientBlob({required this.color, required this.size, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withValues(alpha: opacity),
      ),
    );
  }
}

class _DashboardAction {
  final String title;
  final IconData icon;
  final Color color;
  final String route;

  _DashboardAction({
    required this.title,
    required this.icon,
    required this.color,
    required this.route,
  });
}

class _DashboardTile extends StatelessWidget {
  final _DashboardAction action;

  const _DashboardTile({required this.action});

  @override
  Widget build(BuildContext context) {
    return Pressable(
      onTap: () => context.go(action.route),
      child: Semantics(
        button: true,
        label: action.title,
        child: GlassContainer.flat(
          padding: const EdgeInsets.all(AppSpacing.sm),
          borderRadius: AppSpacing.radiusLg,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm + 2),
                decoration: BoxDecoration(
                  color: action.color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(action.icon, size: 26, color: action.color),
              ),
              const SizedBox(height: AppSpacing.sm),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs),
                child: Text(
                  action.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

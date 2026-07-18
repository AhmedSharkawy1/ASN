import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final authState = ref.watch(authNotifierProvider);

    final user = authState.maybeWhen(
      authenticated: (user) => user,
      orElse: () => null,
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(
          l10n.dashboard,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      drawer: const AppNavigationDrawer(),
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Welcome Banner
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      decoration: BoxDecoration(
                        gradient: AppColors.brandGradient,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.tealPrimary.withValues(alpha: 0.3),
                            blurRadius: 15,
                            offset: const Offset(0, 5),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            radius: 30,
                            backgroundColor: Colors.white.withValues(alpha: 0.2),
                            child: const Icon(Icons.storefront, color: Colors.white, size: 36),
                          ),
                          AppSpacing.widthMd,
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user.name,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  user.email,
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.8),
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    AppSpacing.heightXl,
                    
                    // Quick Actions Grid
                    Text(
                      'Quick Actions', // fallback
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    AppSpacing.heightMd,
                    GridView.count(
                      crossAxisCount: 2,
                      crossAxisSpacing: AppSpacing.md,
                      mainAxisSpacing: AppSpacing.md,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      children: [
                        _DashboardCard(
                          title: l10n.orders,
                          icon: Icons.receipt_long,
                          color: Colors.blueAccent,
                          onTap: () => context.go('/orders'),
                        ),
                        _DashboardCard(
                          title: l10n.products,
                          icon: Icons.restaurant_menu,
                          color: AppColors.tealPrimary,
                          onTap: () => context.go('/products'),
                        ),
                        _DashboardCard(
                          title: l10n.kitchen,
                          icon: Icons.kitchen,
                          color: Colors.orangeAccent,
                          onTap: () => context.go('/kitchen'),
                        ),
                        _DashboardCard(
                          title: l10n.reports,
                          icon: Icons.analytics,
                          color: Colors.deepPurpleAccent,
                          onTap: () => context.go('/reports'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _DashboardCard({
    required this.title,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.05),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 36, color: color),
            ),
            AppSpacing.heightSm,
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

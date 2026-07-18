import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final authState = ref.watch(authNotifierProvider);
    
    final userEmail = authState.maybeWhen(
      authenticated: (user) => user.email,
      orElse: () => 'Not logged in',
    );

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.settings),
      ),
      drawer: const AppNavigationDrawer(),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          // Profile Section
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusLg)),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: AppColors.tealPrimary.withValues(alpha: 0.1),
                    child: const Icon(Icons.person, size: 32, color: AppColors.tealPrimary),
                  ),
                  AppSpacing.widthLg,
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Staff Member',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                        ),
                        AppSpacing.heightXs,
                        Text(
                          userEmail,
                          style: const TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          AppSpacing.heightLg,
          const Padding(
            padding: EdgeInsets.only(left: 8.0, bottom: 8.0),
            child: Text('PREFERENCES', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 12)),
          ),
          
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusLg)),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.notifications_active_outlined),
                  title: const Text('Push Notifications'),
                  trailing: Switch(
                    value: true,
                    activeThumbColor: AppColors.tealPrimary,
                    onChanged: (val) {},
                  ),
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.language),
                  title: const Text('Language'),
                  trailing: const Text('English', style: TextStyle(color: Colors.grey)),
                  onTap: () {},
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.dark_mode_outlined),
                  title: const Text('Dark Mode'),
                  trailing: Switch(
                    value: false,
                    activeThumbColor: AppColors.tealPrimary,
                    onChanged: (val) {},
                  ),
                ),
              ],
            ),
          ),

          AppSpacing.heightLg,
          const Padding(
            padding: EdgeInsets.only(left: 8.0, bottom: 8.0),
            child: Text('ACCOUNT', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 12)),
          ),

          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusLg)),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.info_outline),
                  title: const Text('About App'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () {},
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.logout, color: AppColors.error),
                  title: const Text('Logout', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                  onTap: () {
                    showDialog<void>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Logout'),
                        content: const Text('Are you sure you want to log out?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.pop(ctx);
                              ref.read(authNotifierProvider.notifier).logout();
                            },
                            child: const Text('Logout', style: TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

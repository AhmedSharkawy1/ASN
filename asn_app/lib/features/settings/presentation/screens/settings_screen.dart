import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/localization/locale_provider.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/core/theme/theme_provider.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final authState = ref.watch(authNotifierProvider);
    final themeMode = ref.watch(themeProvider);
    final locale = ref.watch(localeProvider);
    final isArabic = locale.languageCode == 'ar';

    final user = authState.maybeWhen(
      authenticated: (user) => user,
      orElse: () => null,
    );

    String themeModeLabel(ThemeMode mode) => switch (mode) {
          ThemeMode.light => l10n.light,
          ThemeMode.dark => l10n.dark,
          ThemeMode.system => l10n.system,
        };

    return Scaffold(
      appBar: AppBar(title: Text(l10n.settings)),
      drawer: const AppNavigationDrawer(),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          // Profile card
          Container(
            padding: const EdgeInsets.all(AppSpacing.lg),
            decoration: BoxDecoration(
              gradient: AppColors.brandGradient,
              borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
              boxShadow: [
                BoxShadow(
                  color: AppColors.tealPrimary.withValues(alpha: 0.25),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 32,
                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                  child: const Icon(Icons.person, size: 34, color: Colors.white),
                ),
                AppSpacing.widthMd,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user?.name ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 19,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        user?.email ?? '',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.75),
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                        ),
                        child: Text(
                          user?.role.name.toUpperCase() ?? '',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          AppSpacing.heightLg,

          // Preferences
          _SectionLabel(text: l10n.preferences),
          _SettingsGroup(
            children: [
              // Language selector
              _SettingsTile(
                icon: Icons.language,
                iconColor: AppColors.info,
                title: l10n.language,
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      isArabic ? l10n.arabic : l10n.english,
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                  ],
                ),
                onTap: () => showModalBottomSheet<void>(
                  context: context,
                  builder: (ctx) => SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _pickerTile(
                          ctx,
                          label: l10n.arabic,
                          selected: isArabic,
                          onTap: () {
                            ref.read(localeProvider.notifier).setLocale(const Locale('ar'));
                            Navigator.pop(ctx);
                          },
                        ),
                        _pickerTile(
                          ctx,
                          label: l10n.english,
                          selected: !isArabic,
                          onTap: () {
                            ref.read(localeProvider.notifier).setLocale(const Locale('en'));
                            Navigator.pop(ctx);
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const _GroupDivider(),
              // Theme mode selector
              _SettingsTile(
                icon: Icons.dark_mode_outlined,
                iconColor: AppColors.warning,
                title: l10n.themeMode,
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      themeModeLabel(themeMode),
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                    const SizedBox(width: 6),
                    const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                  ],
                ),
                onTap: () => showModalBottomSheet<void>(
                  context: context,
                  builder: (ctx) => SafeArea(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: ThemeMode.values
                          .map(
                            (mode) => _pickerTile(
                              ctx,
                              label: themeModeLabel(mode),
                              selected: themeMode == mode,
                              onTap: () {
                                ref.read(themeProvider.notifier).setThemeMode(mode);
                                Navigator.pop(ctx);
                              },
                            ),
                          )
                          .toList(),
                    ),
                  ),
                ),
              ),
            ],
          ),
          AppSpacing.heightLg,

          // Account
          _SectionLabel(text: l10n.account),
          _SettingsGroup(
            children: [
              _SettingsTile(
                icon: Icons.notifications_active_outlined,
                iconColor: AppColors.warning,
                title: 'تشخيص الإشعارات',
                trailing: const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                onTap: () => context.push('/notification-diagnostics'),
              ),
              const _GroupDivider(),
              _SettingsTile(
                icon: Icons.info_outline,
                iconColor: AppColors.moduleProducts,
                title: l10n.aboutApp,
                trailing: const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                onTap: () async {
                  final info = await PackageInfo.fromPlatform();
                  if (!context.mounted) return;
                  await showDialog<void>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.appName),
                      content: Text('${l10n.version}: ${info.version} (${info.buildNumber})'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: Text(l10n.cancel),
                        ),
                      ],
                    ),
                  );
                },
              ),
              const _GroupDivider(),
              _SettingsTile(
                icon: Icons.logout,
                iconColor: AppColors.error,
                title: l10n.logout,
                titleColor: AppColors.error,
                onTap: () {
                  showDialog<void>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.logout),
                      content: Text(l10n.logoutConfirm),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(ctx),
                          child: Text(l10n.cancel),
                        ),
                        TextButton(
                          style: TextButton.styleFrom(foregroundColor: AppColors.error),
                          onPressed: () {
                            Navigator.pop(ctx);
                            ref.read(authNotifierProvider.notifier).logout();
                          },
                          child: Text(l10n.logout),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _pickerTile(
    BuildContext context, {
    required String label,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return ListTile(
      title: Text(label, style: TextStyle(fontWeight: selected ? FontWeight.w800 : FontWeight.w500)),
      trailing: selected ? const Icon(Icons.check_circle, color: AppColors.tealPrimary) : null,
      onTap: onTap,
    );
  }
}

class _SectionLabel extends StatelessWidget {
  final String text;

  const _SectionLabel({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsetsDirectional.only(start: AppSpacing.xs, bottom: AppSpacing.xs),
      child: Text(
        text.toUpperCase(),
        style: TextStyle(
          fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          fontSize: 11,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  final List<Widget> children;

  const _SettingsGroup({required this.children});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        boxShadow: AppColors.shadowOf(context),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }
}

class _GroupDivider extends StatelessWidget {
  const _GroupDivider();

  @override
  Widget build(BuildContext context) {
    return Divider(
      height: 1,
      indent: 60,
      color: Theme.of(context).dividerColor.withValues(alpha: 0.4),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final Color? titleColor;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsTile({
    required this.icon,
    required this.iconColor,
    required this.title,
    this.titleColor,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 4),
      leading: Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(
          color: iconColor.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: iconColor, size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(
          color: titleColor,
          fontWeight: FontWeight.w600,
          fontSize: 15,
        ),
      ),
      trailing: trailing,
    );
  }
}

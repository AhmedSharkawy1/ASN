import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

/// Friendly empty state with an icon inside a soft tinted circle.
class AppEmptyState extends StatelessWidget {
  final IconData icon;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const AppEmptyState({
    super.key,
    required this.icon,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final secondary = Theme.of(context).colorScheme.onSurfaceVariant;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.tealPrimary.withValues(alpha: 0.08),
              ),
              child: Icon(icon, size: 44, color: AppColors.tealPrimary.withValues(alpha: 0.7)),
            ),
            AppSpacing.heightMd,
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: secondary),
            ),
            if (actionLabel != null && onAction != null) ...[
              AppSpacing.heightMd,
              ElevatedButton.icon(
                onPressed: onAction,
                icon: const Icon(Icons.add, size: 18),
                label: Text(actionLabel!),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Error state with retry button.
class AppErrorState extends StatelessWidget {
  final Object error;
  final VoidCallback onRetry;

  const AppErrorState({super.key, required this.error, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96,
              height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.error.withValues(alpha: 0.08),
              ),
              child: const Icon(Icons.wifi_off_rounded, size: 44, color: AppColors.error),
            ),
            AppSpacing.heightMd,
            Text(
              l10n.errorOccurred,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            AppSpacing.heightXs,
            Text(
              '$error',
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
            AppSpacing.heightMd,
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh, size: 18),
              label: Text(l10n.retryButton),
            ),
          ],
        ),
      ),
    );
  }
}

/// Shimmer skeleton mimicking a list of cards while data loads.
class AppListSkeleton extends StatelessWidget {
  final int itemCount;
  final double itemHeight;

  const AppListSkeleton({super.key, this.itemCount = 8, this.itemHeight = 72});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final base = isDark ? AppColors.darkCardElevated : const Color(0xFFE8EDF3);
    final highlight = isDark ? const Color(0xFF334155) : const Color(0xFFF6F8FB);

    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: highlight,
      child: ListView.separated(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.md),
        itemCount: itemCount,
        separatorBuilder: (context, index) => AppSpacing.heightXs,
        itemBuilder: (context, index) => Container(
          height: itemHeight,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
        ),
      ),
    );
  }
}

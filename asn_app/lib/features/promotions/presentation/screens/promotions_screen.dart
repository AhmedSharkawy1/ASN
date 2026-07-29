import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/promotions/data/models/promotion_model.dart';
import 'package:asn_app/features/promotions/presentation/providers/promotions_provider.dart';
import 'package:asn_app/features/promotions/presentation/widgets/promotion_editor_sheet.dart';

class PromotionsScreen extends ConsumerWidget {
  const PromotionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final promosAsync = ref.watch(promotionsNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.promotions),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(promotionsNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: promosAsync.when(
        data: (promos) {
          if (promos.isEmpty) {
            return AppEmptyState(
              icon: Icons.local_offer_outlined,
              message: l10n.noPromotions,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(promotionsNotifierProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(
                  AppSpacing.md, AppSpacing.md, AppSpacing.md, AppSpacing.xxl),
              itemCount: promos.length,
              separatorBuilder: (context, index) => AppSpacing.heightXs,
              itemBuilder: (context, index) => _PromotionCard(promo: promos[index]),
            ),
          );
        },
        loading: () => const AppListSkeleton(),
        error: (err, stack) => AppErrorState(
          error: err,
          onRetry: () => ref.read(promotionsNotifierProvider.notifier).refresh(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showPromotionEditor(context),
        icon: const Icon(Icons.add),
        label: const Text('عرض جديد'),
      ),
    );
  }
}

class _PromotionCard extends ConsumerWidget {
  final PromotionModel promo;

  const _PromotionCard({required this.promo});

  ({String label, IconData icon, Color color}) get _type {
    switch (promo.discountType) {
      case PromotionModel.typePercentage:
        return (
          label: 'خصم ${_trimZeros(promo.discountValue)}%',
          icon: Icons.percent,
          color: AppColors.steelBlue,
        );
      case PromotionModel.typeFreeShipping:
        return (
          label: 'شحن مجاني',
          icon: Icons.local_shipping_outlined,
          color: AppColors.success,
        );
      default:
        return (
          label: 'خصم ${_trimZeros(promo.discountValue)} ج',
          icon: Icons.payments_outlined,
          color: AppColors.oceanBlue,
        );
    }
  }

  static String _trimZeros(double v) =>
      v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

  String get _targetLabel {
    if (promo.appliesToAllItems) return 'كل الأصناف';
    final items = promo.items;
    if (items.isEmpty) return 'بدون أصناف';
    if (items.length == 1) return items.first.titleAr;
    return '${items.length} أصناف';
  }

  String? get _periodLabel {
    final f = DateFormat('yyyy/MM/dd');
    if (promo.startsAt == null && promo.endsAt == null) return null;
    if (promo.startsAt != null && promo.endsAt != null) {
      return '${f.format(promo.startsAt!)} — ${f.format(promo.endsAt!)}';
    }
    return promo.startsAt != null
        ? 'من ${f.format(promo.startsAt!)}'
        : 'حتى ${f.format(promo.endsAt!)}';
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('حذف العرض'),
        content: Text('سيتم حذف "${promo.nameAr}" نهائياً.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('إلغاء')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('حذف'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ref.read(promotionsNotifierProvider.notifier).deletePromotion(promo.id);
    } catch (e) {
      if (context.mounted) showAppSnackBar(context, '$e', type: AppSnackBarType.error);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final theme = Theme.of(context);
    final notifier = ref.read(promotionsNotifierProvider.notifier);
    final expired = promo.isExpired;
    final dimmed = expired || !promo.isActive;
    final type = _type;

    return Opacity(
      opacity: dimmed ? 0.6 : 1,
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.sm),
        decoration: BoxDecoration(
          color: theme.cardColor,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(color: theme.dividerColor.withValues(alpha: 0.5)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: type.color.withValues(alpha: 0.12),
                  child: Icon(type.icon, color: type.color, size: 20),
                ),
                AppSpacing.widthSm,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        promo.nameAr,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        type.label,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: type.color,
                        ),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: promo.isActive,
                  onChanged: (_) async {
                    try {
                      await notifier.toggleActive(promo.id, promo.isActive);
                    } catch (e) {
                      if (context.mounted) {
                        showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                      }
                    }
                  },
                ),
                PopupMenuButton<String>(
                  onSelected: (value) async {
                    if (value == 'edit') {
                      await showPromotionEditor(context, promo: promo);
                    } else if (value == 'delete') {
                      await _confirmDelete(context, ref);
                    }
                  },
                  itemBuilder: (ctx) => [
                    PopupMenuItem(value: 'edit', child: Text(l10n.edit)),
                    PopupMenuItem(value: 'delete', child: Text(l10n.delete)),
                  ],
                ),
              ],
            ),
            AppSpacing.heightXs,
            Wrap(
              spacing: AppSpacing.xs,
              runSpacing: 4,
              children: [
                _chip(
                  context,
                  icon: promo.appliesToAllItems ? Icons.select_all : Icons.checklist,
                  label: _targetLabel,
                ),
                if (promo.minOrderAmount > 0)
                  _chip(
                    context,
                    icon: Icons.shopping_bag_outlined,
                    label: 'أقل طلب ${_trimZeros(promo.minOrderAmount)} ج',
                  ),
                if (_periodLabel != null)
                  _chip(context, icon: Icons.event_outlined, label: _periodLabel!),
                if (expired)
                  _chip(context,
                      icon: Icons.timer_off_outlined,
                      label: l10n.expired,
                      color: AppColors.error),
              ],
            ),
            // The checkout engine skips a promotion with no items, so it would
            // look active while never discounting anything.
            if (promo.hasNoTarget) ...[
              AppSpacing.heightXs,
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.xs),
                decoration: BoxDecoration(
                  color: AppColors.warning.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.warning),
                    SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        'هذا العرض بدون أصناف فلن يُطبَّق — عدّله واختر الأصناف.',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _chip(BuildContext context,
      {required IconData icon, required String label, Color? color}) {
    final c = color ?? Theme.of(context).colorScheme.onSurfaceVariant;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: c),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 11.5, color: c, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

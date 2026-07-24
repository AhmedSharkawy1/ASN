import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/orders/domain/entities/order_entity.dart';
import 'package:asn_app/features/orders/presentation/providers/orders_provider.dart';
import 'package:url_launcher/url_launcher.dart';

/// Ticks every 30s so elapsed-time badges stay fresh without manual refresh.
final _kdsTickerProvider = StreamProvider<int>((ref) {
  return Stream<int>.periodic(const Duration(seconds: 30), (i) => i);
});

class KitchenScreen extends ConsumerWidget {
  const KitchenScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final ordersAsync = ref.watch(ordersNotifierProvider);
    ref.watch(_kdsTickerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.kitchen),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(ordersNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: ordersAsync.when(
        data: (orders) {
          // Active KDS statuses: new, cooking, and ready-to-hand-off.
          const activeStatuses = {'pending', 'accepted', 'preparing', 'ready'};
          final activeOrders =
              orders.where((o) => activeStatuses.contains(o.status)).toList();

          // Oldest first so the kitchen works the queue in order
          activeOrders.sort((a, b) => a.createdAt.compareTo(b.createdAt));

          if (activeOrders.isEmpty) {
            return AppEmptyState(
              icon: Icons.check_circle_outline,
              message: l10n.allCaughtUp,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(ordersNotifierProvider.notifier).refresh(),
            child: GridView.builder(
              padding: const EdgeInsets.all(AppSpacing.md),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 400,
                mainAxisExtent: 360,
                crossAxisSpacing: AppSpacing.md,
                mainAxisSpacing: AppSpacing.md,
              ),
              itemCount: activeOrders.length,
              itemBuilder: (context, index) {
                return _KitchenTicket(order: activeOrders[index], l10n: l10n);
              },
            ),
          );
        },
        loading: () => const AppListSkeleton(itemHeight: 180),
        error: (err, stack) => AppErrorState(
          error: err,
          onRetry: () => ref.read(ordersNotifierProvider.notifier).refresh(),
        ),
      ),
    );
  }
}

class _KitchenTicket extends ConsumerWidget {
  final OrderEntity order;
  final AppLocalizations l10n;

  const _KitchenTicket({required this.order, required this.l10n});

  (Color, String, String) _stage() {
    switch (order.status) {
      case 'preparing':
        return (AppColors.info, l10n.statusInProgress, 'ready');
      case 'ready':
        return (AppColors.success, l10n.statusReady, 'completed');
      default: // pending / accepted
        return (AppColors.warning, l10n.statusPending, 'preparing');
    }
  }

  String _actionLabel() {
    switch (order.status) {
      case 'preparing':
        return l10n.markReady;
      case 'ready':
        return l10n.markCompleted;
      default:
        return l10n.startPreparing;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final (headerColor, stageLabel, nextStatus) = _stage();
    final elapsed = DateTime.now().difference(order.createdAt);
    final timeStr = DateFormat('hh:mm a').format(order.createdAt);

    // Highlight new orders waiting more than 15 minutes
    final isUrgent = elapsed.inMinutes > 15 && (order.status == 'pending' || order.status == 'accepted');

    Future<void> handleAction() async {
      try {
        await ref.read(ordersNotifierProvider.notifier).updateStatus(order.id, nextStatus);
      } catch (e) {
        if (context.mounted) {
          showAppSnackBar(context, '$e', type: AppSnackBarType.error);
        }
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: isUrgent ? Border.all(color: AppColors.error, width: 2) : null,
        boxShadow: AppColors.shadowOf(context),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header: number, stage, time + elapsed
          Container(
            color: headerColor,
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '#${order.orderNumber}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 19, color: Colors.white),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      stageLabel,
                      style: const TextStyle(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 12),
                    ),
                    Text(
                      '$timeStr • ${elapsed.inMinutes} ${l10n.minutesShort}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Colors.white.withValues(alpha: 0.85),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Items
          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: order.items.length,
              separatorBuilder: (context, index) => const Divider(),
              itemBuilder: (context, index) {
                final item = order.items[index];
                return Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${item.quantity}x',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 17),
                    ),
                    AppSpacing.widthMd,
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.productName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                          if (item.addons.isNotEmpty)
                            Text(
                              item.addons.map((a) => a['name']).join(', '),
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                        ],
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          // Order notes — critical info for the kitchen
          if (order.notes?.isNotEmpty == true)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              padding: const EdgeInsets.all(AppSpacing.xs),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Text(
                '📝 ${order.notes}',
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ),

          // Actions
          Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (order.customerPhone != null && order.customerPhone!.isNotEmpty) ...[
                  OutlinedButton.icon(
                    onPressed: () async {
                      final url = Uri.parse('tel:${order.customerPhone}');
                      if (await canLaunchUrl(url)) {
                        await launchUrl(url);
                      }
                    },
                    icon: const Icon(Icons.phone, size: 18),
                    label: Text(l10n.callCustomer),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.tealPrimary),
                      foregroundColor: AppColors.tealPrimary,
                    ),
                  ),
                  AppSpacing.heightXs,
                ],
                ElevatedButton(
                  onPressed: handleAction,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: headerColor,
                    minimumSize: const Size.fromHeight(52),
                  ),
                  child: Text(
                    _actionLabel(),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.5),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

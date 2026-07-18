import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/features/orders/domain/entities/order_entity.dart';
import 'package:asn_app/features/orders/presentation/providers/orders_provider.dart';
import 'package:url_launcher/url_launcher.dart';

class KitchenScreen extends ConsumerWidget {
  const KitchenScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final ordersAsync = ref.watch(ordersNotifierProvider);

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
          // Filter only active kitchen orders
          final activeOrders = orders.where((o) => o.status == 'pending' || o.status == 'preparing').toList();
          
          // Sort so oldest is first
          activeOrders.sort((a, b) => a.createdAt.compareTo(b.createdAt));

          if (activeOrders.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.check_circle_outline, size: 80, color: AppColors.success),
                  AppSpacing.heightMd,
                  Text(
                    'All caught up! No active orders.',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(color: Colors.grey),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(ordersNotifierProvider.notifier).refresh(),
            child: GridView.builder(
              padding: const EdgeInsets.all(AppSpacing.md),
              gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                maxCrossAxisExtent: 400,
                mainAxisExtent: 350,
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
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}

class _KitchenTicket extends ConsumerWidget {
  final OrderEntity order;
  final AppLocalizations l10n;

  const _KitchenTicket({required this.order, required this.l10n});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isPending = order.status == 'pending';
    final headerColor = isPending ? AppColors.warning : AppColors.info;
    final duration = DateTime.now().difference(order.createdAt);
    final timeStr = DateFormat('hh:mm a').format(order.createdAt);
    
    // Highlight if it's been waiting longer than 15 mins
    final isUrgent = duration.inMinutes > 15 && isPending;

    Future<void> handleAction(String nextStatus) async {
      try {
        await ref.read(ordersNotifierProvider.notifier).updateStatus(order.id, nextStatus);
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to update: $e'), backgroundColor: AppColors.error),
          );
        }
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: isUrgent ? Border.all(color: AppColors.error, width: 2) : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            color: headerColor,
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '#${order.orderNumber}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Colors.white),
                ),
                Text(
                  timeStr,
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ],
            ),
          ),
          
          // Items List
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
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                    ),
                    AppSpacing.widthMd,
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.productName,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
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
          
          // Call Customer & Action Buttons
          Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (order.customerPhone != null && order.customerPhone!.isNotEmpty)
                  OutlinedButton.icon(
                    onPressed: () async {
                      final url = Uri.parse('tel:${order.customerPhone}');
                      if (await canLaunchUrl(url)) {
                        await launchUrl(url);
                      }
                    },
                    icon: const Icon(Icons.phone, size: 18),
                    label: const Text('اتصل بالعميل'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      side: const BorderSide(color: AppColors.tealPrimary),
                      foregroundColor: AppColors.tealPrimary,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
                    ),
                  ),
                if (order.customerPhone != null && order.customerPhone!.isNotEmpty)
                  AppSpacing.heightSm,
                ElevatedButton(
                  onPressed: () => handleAction(isPending ? 'preparing' : 'ready'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isPending ? AppColors.tealPrimary : AppColors.success,
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(56),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
                  ),
                  child: Text(
                    isPending ? 'START PREPARING' : 'MARK READY',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.2),
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

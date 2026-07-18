import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';

import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/features/orders/domain/entities/order_entity.dart';
import 'package:asn_app/features/orders/presentation/providers/orders_provider.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';

class OrdersListScreen extends ConsumerStatefulWidget {
  const OrdersListScreen({super.key});

  @override
  ConsumerState<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends ConsumerState<OrdersListScreen> {
  String _selectedStatusFilter = 'all';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isAr = Localizations.localeOf(context).languageCode == 'ar';
    final authState = ref.watch(authNotifierProvider);

    final user = authState.maybeWhen(
      authenticated: (u) => u,
      orElse: () => null,
    );

    if (authState == const AuthState.loading()) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (user == null) {
      return Scaffold(
        appBar: AppBar(title: Text(l10n.orders)),
        drawer: const AppNavigationDrawer(),
        body: const Center(
          child: Text('Unauthorized. Please log in.', style: TextStyle(color: Colors.red)),
        ),
      );
    }

    final ordersAsync = ref.watch(ordersNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.orders),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(ordersNotifierProvider.notifier).refresh();
            },
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: Column(
        children: [
          // Status Tabs
          _buildStatusTabs(l10n),
          
          // Main list
          Expanded(
            child: ordersAsync.when(
              data: (orders) {
                final filteredOrders = orders.where((o) {
                  if (_selectedStatusFilter == 'all') return true;
                  return o.status == _selectedStatusFilter;
                }).toList();

                if (filteredOrders.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.assignment_turned_in_outlined, size: 64, color: Colors.grey),
                        AppSpacing.heightMd,
                        Text(
                          l10n.noOrders,
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(ordersNotifierProvider.notifier).refresh(),
                  child: ListView.builder(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: filteredOrders.length,
                    itemBuilder: (context, index) {
                      final order = filteredOrders[index];
                      return _buildOrderCard(context, order, isAr, l10n);
                    },
                  ),
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 64, color: AppColors.error),
                    AppSpacing.heightMd,
                    Text('Error: $err', style: const TextStyle(fontWeight: FontWeight.bold)),
                    AppSpacing.heightMd,
                    ElevatedButton(
                      onPressed: () => ref.read(ordersNotifierProvider.notifier).refresh(),
                      child: Text(l10n.retryButton),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusTabs(AppLocalizations l10n) {
    final filters = [
      {'key': 'all', 'label': l10n.arabic == 'العربية' ? 'الكل' : 'All'},
      {'key': 'pending', 'label': l10n.statusPending},
      {'key': 'preparing', 'label': l10n.statusInProgress},
      {'key': 'completed', 'label': l10n.statusCompleted},
      {'key': 'cancelled', 'label': l10n.statusCancelled},
    ];

    return Container(
      height: 48,
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        itemCount: filters.length,
        itemBuilder: (context, index) {
          final filter = filters[index];
          final isSelected = _selectedStatusFilter == filter['key'];

          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4.0),
            child: ChoiceChip(
              label: Text(
                filter['label']!,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : Colors.grey,
                ),
              ),
              selected: isSelected,
              selectedColor: AppColors.tealPrimary,
              backgroundColor: Theme.of(context).cardTheme.color,
              onSelected: (selected) {
                if (selected) {
                  setState(() {
                    _selectedStatusFilter = filter['key']!;
                  });
                }
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, OrderEntity order, bool isAr, AppLocalizations l10n) {
    final statusColor = _getStatusColor(order.status);
    final statusLabel = _getStatusLabel(order.status, l10n);
    final timeStr = DateFormat('hh:mm a | yyyy-MM-dd').format(order.createdAt);

    return Card(
      margin: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: InkWell(
        onTap: () => _showOrderDetailsBottomSheet(context, order, l10n),
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Order #${order.orderNumber}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusXs),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(color: statusColor, fontWeight: FontWeight.w800, fontSize: 12),
                    ),
                  ),
                ],
              ),
              AppSpacing.heightSm,
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    order.customerName ?? (isAr ? 'زبون سفري' : 'Takeaway Customer'),
                    style: const TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                  Text(
                    '\$${order.totalPrice.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppColors.tealPrimary),
                  ),
                ],
              ),
              AppSpacing.heightSm,
              const Divider(),
              AppSpacing.heightSm,
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.payment, size: 16, color: Colors.grey),
                      AppSpacing.widthXs,
                      Text(
                        order.paymentMethod == 'cash' ? l10n.paymentCash : l10n.paymentCard,
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                  Text(
                    timeStr,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return AppColors.warning;
      case 'preparing':
      case 'accepted':
        return AppColors.info;
      case 'ready':
      case 'completed':
        return AppColors.success;
      case 'cancelled':
      default:
        return AppColors.error;
    }
  }

  String _getStatusLabel(String status, AppLocalizations l10n) {
    switch (status) {
      case 'pending':
        return l10n.statusPending;
      case 'preparing':
      case 'accepted':
        return l10n.statusInProgress;
      case 'ready':
      case 'completed':
        return l10n.statusCompleted;
      case 'cancelled':
      default:
        return l10n.statusCancelled;
    }
  }

  void _showOrderDetailsBottomSheet(BuildContext context, OrderEntity order, AppLocalizations l10n) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _OrderDetailsWidget(order: order, l10n: l10n),
    );
  }
}

class _OrderDetailsWidget extends ConsumerWidget {
  final OrderEntity order;
  final AppLocalizations l10n;

  const _OrderDetailsWidget({required this.order, required this.l10n});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statusColor = _getStatusColor(order.status);
    final statusLabel = _getStatusLabel(order.status, l10n);

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(AppSpacing.radiusLg),
          topRight: Radius.circular(AppSpacing.radiusLg),
        ),
      ),
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: FractionallySizedBox(
        heightFactor: 0.85,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 48,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            AppSpacing.heightLg,
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order #${order.orderNumber}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            AppSpacing.heightSm,
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusXs),
                  ),
                  child: Text(
                    statusLabel,
                    style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 13),
                  ),
                ),
                Text(
                  '\$${order.totalPrice.toStringAsFixed(2)}',
                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: AppColors.tealPrimary),
                ),
              ],
            ),
            const Divider(height: 32),
            Expanded(
              child: ListView(
                children: [
                  const Text('CUSTOMER INFO', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 12)),
                  AppSpacing.heightXs,
                  Text(order.customerName ?? 'Takeaway Customer', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  if (order.customerPhone != null) ...[
                    AppSpacing.heightXs,
                    Text(order.customerPhone!, style: const TextStyle(fontSize: 14)),
                  ],
                  if (order.customerAddress != null) ...[
                    AppSpacing.heightXs,
                    Text(order.customerAddress!, style: const TextStyle(fontSize: 14)),
                  ],
                  if (order.notes != null && order.notes!.isNotEmpty) ...[
                    AppSpacing.heightSm,
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.sm),
                      decoration: BoxDecoration(
                        color: Colors.amber.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Text('Notes: ${order.notes}', style: const TextStyle(color: Colors.amber, fontSize: 13)),
                    ),
                  ],
                  const Divider(height: 32),
                  const Text('ORDER ITEMS', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey, fontSize: 12)),
                  AppSpacing.heightSm,
                  ...order.items.map((item) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: AppColors.tealPrimary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text('${item.quantity}x', style: const TextStyle(color: AppColors.tealPrimary, fontWeight: FontWeight.bold)),
                            ),
                            AppSpacing.widthSm,
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.productName, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  if (item.addons.isNotEmpty)
                                    Text(
                                      item.addons.map((a) => a['name']).join(', '),
                                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                                    ),
                                ],
                              ),
                            ),
                            Text('\$${(item.price * item.quantity).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      )),
                ],
              ),
            ),
            const Divider(height: 32),
            _buildActionButtons(context, ref),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(ordersNotifierProvider.notifier);

    Future<void> handleUpdate(String newStatus) async {
      try {
        await notifier.updateStatus(order.id, newStatus);
        if (context.mounted) Navigator.pop(context);
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to update order: $e'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    }

    if (order.status == 'pending') {
      return Row(
        children: [
          Expanded(
            child: ElevatedButton(
              onPressed: () => handleUpdate('preparing'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.tealPrimary,
                foregroundColor: Colors.white,
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
              ),
              child: const Text('Accept & Prepare'),
            ),
          ),
          AppSpacing.widthSm,
          ElevatedButton(
            onPressed: () => handleUpdate('cancelled'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error.withValues(alpha: 0.1),
              foregroundColor: AppColors.error,
              elevation: 0,
              minimumSize: const Size(100, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
            ),
            child: const Text('Cancel'),
          ),
        ],
      );
    } else if (order.status == 'preparing') {
      return ElevatedButton(
        onPressed: () => handleUpdate('completed'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.success,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
        ),
        child: const Text('Complete Order'),
      );
    }

    return ElevatedButton(
      onPressed: () => Navigator.pop(context),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.grey.withValues(alpha: 0.1),
        foregroundColor: Colors.black,
        elevation: 0,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusMd)),
      ),
      child: const Text('Close'),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return AppColors.warning;
      case 'preparing':
      case 'accepted':
        return AppColors.info;
      case 'ready':
      case 'completed':
        return AppColors.success;
      case 'cancelled':
      default:
        return AppColors.error;
    }
  }

  String _getStatusLabel(String status, AppLocalizations l10n) {
    switch (status) {
      case 'pending':
        return l10n.statusPending;
      case 'preparing':
      case 'accepted':
        return l10n.statusInProgress;
      case 'ready':
      case 'completed':
        return l10n.statusCompleted;
      case 'cancelled':
      default:
        return l10n.statusCancelled;
    }
  }
}

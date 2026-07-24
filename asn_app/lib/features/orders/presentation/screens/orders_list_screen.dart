import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/services/order_alert_builder.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/features/orders/domain/entities/order_entity.dart';
import 'package:asn_app/features/orders/presentation/providers/orders_provider.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';

String _money(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);

Color statusColorOf(String status) {
  switch (status) {
    case 'completed':
      return AppColors.success;
    case 'preparing':
    case 'accepted':
      return AppColors.info;
    case 'ready':
      return AppColors.tealPrimary;
    case 'cancelled':
      return AppColors.error;
    default:
      return AppColors.warning;
  }
}

String statusLabelOf(String status, AppLocalizations l10n) {
  switch (status) {
    case 'completed':
      return l10n.statusCompleted;
    case 'preparing':
    case 'accepted':
      return l10n.statusInProgress;
    case 'ready':
      return l10n.statusReady;
    case 'cancelled':
      return l10n.statusCancelled;
    default:
      return l10n.statusPending;
  }
}

IconData _orderTypeIcon(String? type) {
  switch (type) {
    case 'delivery':
      return Icons.delivery_dining;
    case 'dine_in':
      return Icons.restaurant;
    default:
      return Icons.takeout_dining;
  }
}

class OrdersListScreen extends ConsumerStatefulWidget {
  const OrdersListScreen({super.key});

  @override
  ConsumerState<OrdersListScreen> createState() => _OrdersListScreenState();
}

class _OrdersListScreenState extends ConsumerState<OrdersListScreen> {
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final ordersAsync = ref.watch(ordersNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.orders),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(ordersNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: Column(
        children: [
          _StatusFilterBar(
            selected: _filter,
            onSelect: (f) => setState(() => _filter = f),
          ),
          Expanded(
            child: ordersAsync.when(
              data: (orders) {
                final filtered = _filter == 'all'
                    ? orders
                    : orders.where((o) {
                        if (_filter == 'preparing') {
                          return o.status == 'preparing' || o.status == 'accepted';
                        }
                        return o.status == _filter;
                      }).toList();

                if (filtered.isEmpty) {
                  return AppEmptyState(
                    icon: Icons.receipt_long_outlined,
                    message: l10n.noOrders,
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(ordersNotifierProvider.notifier).refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                        AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.xl),
                    itemCount: filtered.length,
                    separatorBuilder: (context, index) => AppSpacing.heightSm,
                    itemBuilder: (context, index) => _OrderCard(order: filtered[index]),
                  ),
                );
              },
              loading: () => const AppListSkeleton(itemHeight: 130),
              error: (err, stack) => AppErrorState(
                error: err,
                onRetry: () => ref.read(ordersNotifierProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusFilterBar extends StatelessWidget {
  final String selected;
  final ValueChanged<String> onSelect;

  const _StatusFilterBar({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final filters = <({String key, String label})>[
      (key: 'all', label: l10n.allCategories),
      (key: 'pending', label: l10n.statusPending),
      (key: 'preparing', label: l10n.statusInProgress),
      (key: 'ready', label: l10n.statusReady),
      (key: 'completed', label: l10n.statusCompleted),
      (key: 'cancelled', label: l10n.statusCancelled),
    ];

    return SizedBox(
      height: 50,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
        itemCount: filters.length,
        separatorBuilder: (context, index) => AppSpacing.widthXs,
        itemBuilder: (context, index) {
          final f = filters[index];
          final isSelected = selected == f.key;
          final color = f.key == 'all' ? AppColors.tealPrimary : statusColorOf(f.key);
          return ChoiceChip(
            label: Text(f.label),
            selected: isSelected,
            showCheckmark: false,
            selectedColor: color.withValues(alpha: 0.16),
            side: BorderSide(
              color: isSelected ? color : Theme.of(context).colorScheme.outline,
            ),
            labelStyle: TextStyle(
              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              color: isSelected ? color : null,
              fontSize: 13,
            ),
            onSelected: (_) => onSelect(f.key),
          );
        },
      ),
    );
  }
}

/// Premium order card: status stripe, type + time, customer, item preview,
/// total, and a one-tap call button.
class _OrderCard extends ConsumerWidget {
  final OrderEntity order;

  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final color = statusColorOf(order.status);
    final time = DateFormat('hh:mm a').format(order.createdAt);
    final hasPhone = order.customerPhone?.trim().isNotEmpty == true;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        boxShadow: AppColors.shadowOf(context),
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => showOrderDetailsSheet(context, order),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Status accent stripe
                Container(width: 5, color: color),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header: number + type + status pill
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                gradient: AppColors.brandGradient,
                                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                              ),
                              child: Text(
                                '#${order.orderNumber}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            AppSpacing.widthXs,
                            Icon(_orderTypeIcon(order.orderType), size: 15, color: Colors.grey),
                            const SizedBox(width: 3),
                            Text(
                              OrderAlert.orderTypeLabel(order.orderType),
                              style: const TextStyle(fontSize: 11, color: Colors.grey),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                              ),
                              child: Text(
                                statusLabelOf(order.status, l10n),
                                style: TextStyle(
                                  color: color,
                                  fontWeight: FontWeight.w800,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                        AppSpacing.heightXs,

                        // Customer
                        Row(
                          children: [
                            const Icon(Icons.person_outline, size: 15, color: Colors.grey),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                order.customerName?.trim().isNotEmpty == true
                                    ? order.customerName!
                                    : '—',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700, fontSize: 14),
                              ),
                            ),
                            const Icon(Icons.schedule, size: 13, color: Colors.grey),
                            const SizedBox(width: 3),
                            Text(time, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ),

                        // Item preview chips
                        if (order.items.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 4,
                            runSpacing: 4,
                            children: [
                              ...order.items.take(3).map(
                                    (i) => Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 7, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .surfaceContainerHighest,
                                        borderRadius:
                                            BorderRadius.circular(AppSpacing.radiusSm),
                                      ),
                                      child: Text(
                                        '${i.quantity}× ${i.productName}',
                                        style: const TextStyle(
                                            fontSize: 10, fontWeight: FontWeight.w600),
                                      ),
                                    ),
                                  ),
                              if (order.items.length > 3)
                                Container(
                                  padding:
                                      const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.tealPrimary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                  ),
                                  child: Text(
                                    '+${order.items.length - 3}',
                                    style: const TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w800,
                                      color: AppColors.tealPrimary,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                        AppSpacing.heightXs,
                        Divider(
                            height: 1,
                            color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                        const SizedBox(height: 6),

                        // Footer: total + call
                        Row(
                          children: [
                            Text(
                              '${_money(order.totalPrice)} ',
                              style: const TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 18,
                                color: AppColors.tealPrimary,
                              ),
                            ),
                            const Text('جنيه',
                                style: TextStyle(fontSize: 11, color: Colors.grey)),
                            const Spacer(),
                            if (hasPhone)
                              _CallButton(phone: order.customerPhone!, compact: true),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Gradient pill call button — the "زرار شكل حلو" for ringing the customer.
class _CallButton extends StatelessWidget {
  final String phone;
  final bool compact;

  const _CallButton({required this.phone, this.compact = false});

  Future<void> _call() async {
    final uri = Uri(scheme: 'tel', path: phone);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: _call,
        borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
        child: Ink(
          padding: EdgeInsets.symmetric(
            horizontal: compact ? 12 : AppSpacing.lg,
            vertical: compact ? 7 : 12,
          ),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.success, Color(0xFF0E9F6E)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
            boxShadow: [
              BoxShadow(
                color: AppColors.success.withValues(alpha: 0.35),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.phone_in_talk, color: Colors.white, size: compact ? 15 : 19),
              SizedBox(width: compact ? 5 : 8),
              Text(
                compact ? 'اتصال' : l10n.callCustomer,
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  fontSize: compact ? 12 : 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

void showOrderDetailsSheet(BuildContext context, OrderEntity order) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (ctx) => OrderDetailsSheet(order: order),
  );
}

/// Full order detail: customer, every item with its category/size, the money
/// breakdown, notes, and status actions.
class OrderDetailsSheet extends ConsumerWidget {
  final OrderEntity order;

  const OrderDetailsSheet({super.key, required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final color = statusColorOf(order.status);
    final hasPhone = order.customerPhone?.trim().isNotEmpty == true;
    final dateStr = DateFormat('yyyy-MM-dd • hh:mm a').format(order.createdAt);

    // Fall back to summing lines when the server didn't store a subtotal.
    final subtotal = order.subtotal > 0
        ? order.subtotal
        : order.items.fold<double>(0, (s, i) => s + i.lineTotal);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) => Column(
        children: [
          // Gradient header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [color, color.withValues(alpha: 0.75)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Text(
                      '#${order.orderNumber}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 24,
                      ),
                    ),
                    AppSpacing.widthSm,
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.22),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                      ),
                      child: Text(
                        statusLabelOf(order.status, l10n),
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const Spacer(),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${_money(order.totalPrice)} جنيه',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w900,
                            fontSize: 20,
                          ),
                        ),
                        Text(
                          OrderAlert.paymentLabel(order.paymentMethod),
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.85),
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                AppSpacing.heightXs,
                Row(
                  children: [
                    Icon(_orderTypeIcon(order.orderType),
                        size: 15, color: Colors.white.withValues(alpha: 0.9)),
                    const SizedBox(width: 5),
                    Text(
                      OrderAlert.orderTypeLabel(order.orderType),
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.9),
                          fontSize: 12,
                          fontWeight: FontWeight.w600),
                    ),
                    const Spacer(),
                    Text(
                      dateStr,
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.85), fontSize: 11),
                    ),
                  ],
                ),
              ],
            ),
          ),

          Expanded(
            child: ListView(
              controller: scrollController,
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                // Customer card + big call button
                if (order.customerName?.trim().isNotEmpty == true || hasPhone) ...[
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surfaceContainerHighest,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const CircleAvatar(
                              radius: 20,
                              backgroundColor: AppColors.tealPrimary,
                              child: Icon(Icons.person, color: Colors.white, size: 22),
                            ),
                            AppSpacing.widthSm,
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    order.customerName?.trim().isNotEmpty == true
                                        ? order.customerName!
                                        : '—',
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w800, fontSize: 15),
                                  ),
                                  if (hasPhone)
                                    Text(
                                      order.customerPhone!,
                                      style: const TextStyle(
                                          fontSize: 13, color: Colors.grey),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (order.customerAddress?.trim().isNotEmpty == true) ...[
                          AppSpacing.heightXs,
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Icon(Icons.location_on_outlined,
                                  size: 16, color: AppColors.error),
                              const SizedBox(width: 5),
                              Expanded(
                                child: Text(order.customerAddress!,
                                    style: const TextStyle(fontSize: 12)),
                              ),
                            ],
                          ),
                        ],
                        if (hasPhone) ...[
                          AppSpacing.heightSm,
                          SizedBox(
                            width: double.infinity,
                            child: Center(child: _CallButton(phone: order.customerPhone!)),
                          ),
                        ],
                      ],
                    ),
                  ),
                  AppSpacing.heightMd,
                ],

                // Items
                Text('${l10n.itemsLabel} (${order.itemCount})',
                    style: Theme.of(context).textTheme.titleMedium),
                AppSpacing.heightXs,
                ...order.items.map((item) => _ItemRow(item: item)),
                AppSpacing.heightMd,

                // Money breakdown
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                  child: Column(
                    children: [
                      _MoneyRow(label: l10n.subtotal, value: subtotal),
                      if (order.discount > 0)
                        _MoneyRow(
                            label: l10n.discount,
                            value: -order.discount,
                            color: AppColors.error),
                      if (order.deliveryFee > 0)
                        _MoneyRow(label: l10n.deliveryFee, value: order.deliveryFee),
                      const Divider(height: AppSpacing.md),
                      _MoneyRow(label: l10n.total, value: order.totalPrice, isTotal: true),
                    ],
                  ),
                ),

                if (order.notes?.trim().isNotEmpty == true) ...[
                  AppSpacing.heightMd,
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                      border: Border.all(color: AppColors.warning.withValues(alpha: 0.35)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.sticky_note_2_outlined,
                            size: 18, color: AppColors.warning),
                        AppSpacing.widthXs,
                        Expanded(
                          child: Text(order.notes!,
                              style: const TextStyle(fontSize: 13, height: 1.5)),
                        ),
                      ],
                    ),
                  ),
                ],
                AppSpacing.heightLg,

                // Status actions
                _StatusActions(order: order),
                AppSpacing.heightLg,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ItemRow extends StatelessWidget {
  final OrderItemEntity item;

  const _ItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quantity badge
          Container(
            width: 30,
            height: 30,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColors.tealPrimary.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
            ),
            child: Text(
              '${item.quantity}×',
              style: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 12,
                color: AppColors.tealPrimary,
              ),
            ),
          ),
          AppSpacing.widthSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.productName,
                  style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
                ),
                Wrap(
                  spacing: 6,
                  children: [
                    if (item.size?.isNotEmpty == true)
                      Text('📏 ${item.size}',
                          style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    if (item.category?.isNotEmpty == true)
                      Text('🏷️ ${item.category}',
                          style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
                if (item.addons.isNotEmpty)
                  Text(
                    item.addons.map((a) => a['name'] ?? '').join('، '),
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
              ],
            ),
          ),
          AppSpacing.widthXs,
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _money(item.lineTotal),
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
              ),
              if (item.quantity > 1)
                Text('${_money(item.price)} × ${item.quantity}',
                    style: const TextStyle(fontSize: 10, color: Colors.grey)),
            ],
          ),
        ],
      ),
    );
  }
}

class _MoneyRow extends StatelessWidget {
  final String label;
  final double value;
  final bool isTotal;
  final Color? color;

  const _MoneyRow({
    required this.label,
    required this.value,
    this.isTotal = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 15 : 13,
              fontWeight: isTotal ? FontWeight.w900 : FontWeight.w600,
              color: isTotal ? null : Colors.grey,
            ),
          ),
          Text(
            '${_money(value)} جنيه',
            style: TextStyle(
              fontSize: isTotal ? 18 : 13,
              fontWeight: isTotal ? FontWeight.w900 : FontWeight.w700,
              color: color ?? (isTotal ? AppColors.tealPrimary : null),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusActions extends ConsumerWidget {
  final OrderEntity order;

  const _StatusActions({required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    Future<void> setStatus(String status) async {
      try {
        await ref.read(ordersNotifierProvider.notifier).updateStatus(order.id, status);
        if (context.mounted) Navigator.pop(context);
      } catch (e) {
        if (context.mounted) showAppSnackBar(context, '$e', type: AppSnackBarType.error);
      }
    }

    final next = switch (order.status) {
      'pending' || 'accepted' => (label: l10n.startPreparing, value: 'preparing'),
      'preparing' => (label: l10n.markReady, value: 'ready'),
      'ready' => (label: l10n.markCompleted, value: 'completed'),
      _ => null,
    };

    if (next == null && order.status != 'pending') {
      return const SizedBox.shrink();
    }

    return Row(
      children: [
        if (order.status != 'cancelled' && order.status != 'completed')
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () => setStatus('cancelled'),
              icon: const Icon(Icons.close, size: 18),
              label: Text(l10n.statusCancelled),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppColors.error,
                side: const BorderSide(color: AppColors.error),
              ),
            ),
          ),
        if (next != null) ...[
          AppSpacing.widthSm,
          Expanded(
            flex: 2,
            child: ElevatedButton.icon(
              onPressed: () => setStatus(next.value),
              icon: const Icon(Icons.arrow_forward, size: 18),
              label: Text(next.label),
              style: ElevatedButton.styleFrom(
                backgroundColor: statusColorOf(next.value),
                minimumSize: const Size.fromHeight(48),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

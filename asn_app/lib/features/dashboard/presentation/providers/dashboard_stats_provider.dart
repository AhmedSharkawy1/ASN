import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class RecentOrder {
  final String orderNumber;
  final String? customerName;
  final double total;
  final String status;
  final DateTime createdAt;

  const RecentOrder({
    required this.orderNumber,
    this.customerName,
    required this.total,
    required this.status,
    required this.createdAt,
  });
}

class DashboardStats {
  final double todayRevenue;
  final int todayOrders;
  final int pendingOrders;
  final List<RecentOrder> recentOrders;

  const DashboardStats({
    required this.todayRevenue,
    required this.todayOrders,
    required this.pendingOrders,
    required this.recentOrders,
  });

  static const empty = DashboardStats(
    todayRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0,
    recentOrders: [],
  );
}

class DashboardStatsNotifier extends Notifier<AsyncValue<DashboardStats>> {
  @override
  AsyncValue<DashboardStats> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetch();
    return const AsyncValue.loading();
  }

  Future<void> _fetch() async {
    final authState = ref.read(authNotifierProvider);
    final restaurantId = authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );

    if (restaurantId == null) {
      state = const AsyncValue.data(DashboardStats.empty);
      return;
    }

    try {
      final now = DateTime.now();
      final startOfToday = DateTime(now.year, now.month, now.day);

      final response = await SupabaseClientManager.client
          .from('orders')
          .select('order_number, customer_name, total, status, created_at, is_draft')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', startOfToday.toUtc().toIso8601String())
          .order('created_at', ascending: false);

      double revenue = 0;
      int count = 0;
      int pending = 0;
      final recent = <RecentOrder>[];

      for (final json in response as List) {
        if (json['is_draft'] == true) continue;
        final status = json['status'] as String? ?? 'pending';
        if (status == 'cancelled') continue;

        final total = (json['total'] as num? ?? 0).toDouble();
        count++;
        revenue += total;
        if (status == 'pending') pending++;

        if (recent.length < 5) {
          recent.add(RecentOrder(
            orderNumber: json['order_number']?.toString() ?? '',
            customerName: json['customer_name'] as String?,
            total: total,
            status: status,
            createdAt: DateTime.parse(json['created_at'] as String).toLocal(),
          ));
        }
      }

      state = AsyncValue.data(DashboardStats(
        todayRevenue: revenue,
        todayOrders: count,
        pendingOrders: pending,
        recentOrders: recent,
      ));
    } catch (e, st) {
      AppLogger.error('Failed to load dashboard stats', error: e, stackTrace: st, name: 'DashboardStats');
      // Stats are auxiliary: fall back to empty rather than blocking the dashboard
      state = const AsyncValue.data(DashboardStats.empty);
    }
  }

  Future<void> refresh() => _fetch();
}

final dashboardStatsProvider =
    NotifierProvider<DashboardStatsNotifier, AsyncValue<DashboardStats>>(() {
  return DashboardStatsNotifier();
});

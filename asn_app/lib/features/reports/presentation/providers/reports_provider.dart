import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

enum ReportRange { today, week, month }

extension ReportRangeDays on ReportRange {
  int get days => switch (this) {
        ReportRange.today => 1,
        ReportRange.week => 7,
        ReportRange.month => 30,
      };
}

class TopProduct {
  final String title;
  final int quantity;
  final double revenue;

  const TopProduct({required this.title, required this.quantity, required this.revenue});
}

class ReportData {
  final double totalRevenue;
  final int totalOrders;
  final double avgOrderValue;
  final int pendingOrders;
  final int cancelledOrders;

  /// Revenue per day, oldest first. For `today` this is revenue per hour block.
  final List<double> trend;
  final List<String> trendLabels;
  final List<TopProduct> topProducts;
  final Map<String, double> paymentBreakdown;
  final Map<String, int> orderTypeBreakdown;

  const ReportData({
    required this.totalRevenue,
    required this.totalOrders,
    required this.avgOrderValue,
    required this.pendingOrders,
    required this.cancelledOrders,
    required this.trend,
    required this.trendLabels,
    required this.topProducts,
    required this.paymentBreakdown,
    required this.orderTypeBreakdown,
  });

  static const empty = ReportData(
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    trend: [],
    trendLabels: [],
    topProducts: [],
    paymentBreakdown: {},
    orderTypeBreakdown: {},
  );
}

class ReportRangeNotifier extends Notifier<ReportRange> {
  @override
  ReportRange build() => ReportRange.week;

  void set(ReportRange range) => state = range;
}

final reportRangeProvider = NotifierProvider<ReportRangeNotifier, ReportRange>(
  ReportRangeNotifier.new,
);

class ReportsNotifier extends Notifier<AsyncValue<ReportData>> {
  @override
  AsyncValue<ReportData> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    // Recompute whenever the selected range changes.
    ref.watch(reportRangeProvider);
    _fetchReport();
    return const AsyncValue.loading();
  }

  Future<void> _fetchReport() async {
    final authState = ref.read(authNotifierProvider);
    final restaurantId = authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );

    if (restaurantId == null) {
      state = const AsyncValue.data(ReportData.empty);
      return;
    }

    final range = ref.read(reportRangeProvider);

    try {
      final now = DateTime.now();
      final startOfToday = DateTime(now.year, now.month, now.day);
      final rangeStart = range == ReportRange.today
          ? startOfToday
          : startOfToday.subtract(Duration(days: range.days - 1));

      final response = await SupabaseClientManager.client
          .from('orders')
          .select('total, status, created_at, items, payment_method, order_type, is_draft')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', rangeStart.toUtc().toIso8601String());

      final List<dynamic> rawOrders = response as List;

      double totalRevenue = 0;
      int totalOrders = 0;
      int pendingOrders = 0;
      int cancelledOrders = 0;
      final Map<String, TopProduct> products = {};
      final Map<String, double> payments = {};
      final Map<String, int> orderTypes = {};

      // Trend buckets: hourly (4h blocks) for today, daily otherwise.
      final bucketCount = range == ReportRange.today ? 6 : range.days;
      final trend = List.filled(bucketCount, 0.0);
      final trendLabels = List.generate(bucketCount, (i) {
        if (range == ReportRange.today) return '${i * 4}';
        final day = rangeStart.add(Duration(days: i));
        return '${day.day}/${day.month}';
      });

      for (final json in rawOrders) {
        final status = json['status'] as String? ?? 'pending';
        final isDraft = json['is_draft'] as bool? ?? false;
        if (isDraft) continue;

        final price = (json['total'] as num?)?.toDouble() ?? 0.0;
        final createdAt = DateTime.parse(json['created_at'] as String).toLocal();

        if (status == 'cancelled') {
          cancelledOrders++;
          continue;
        }
        if (status == 'pending') pendingOrders++;

        totalOrders++;
        totalRevenue += price;

        // Trend bucket
        if (range == ReportRange.today) {
          final bucket = (createdAt.hour ~/ 4).clamp(0, bucketCount - 1);
          trend[bucket] += price;
        } else {
          final dayIndex = DateTime(createdAt.year, createdAt.month, createdAt.day)
              .difference(rangeStart)
              .inDays;
          if (dayIndex >= 0 && dayIndex < bucketCount) trend[dayIndex] += price;
        }

        // Payment breakdown
        final payment = json['payment_method']?.toString() ?? 'cash';
        payments[payment] = (payments[payment] ?? 0) + price;

        // Order type breakdown
        final type = json['order_type']?.toString() ?? 'takeaway';
        orderTypes[type] = (orderTypes[type] ?? 0) + 1;

        // Top products from items jsonb (web + POS shapes)
        final items = json['items'];
        if (items is List) {
          for (final item in items.whereType<Map<String, dynamic>>()) {
            final title = (item['title'] ?? item['product_name'])?.toString() ?? '—';
            final qty = ((item['qty'] ?? item['quantity']) as num? ?? 1).toInt();
            final itemPrice = (item['price'] as num? ?? 0).toDouble();
            final existing = products[title];
            products[title] = TopProduct(
              title: title,
              quantity: (existing?.quantity ?? 0) + qty,
              revenue: (existing?.revenue ?? 0) + itemPrice * qty,
            );
          }
        }
      }

      final topProducts = products.values.toList()
        ..sort((a, b) => b.quantity.compareTo(a.quantity));

      state = AsyncValue.data(ReportData(
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        pendingOrders: pendingOrders,
        cancelledOrders: cancelledOrders,
        trend: trend,
        trendLabels: trendLabels,
        topProducts: topProducts.take(8).toList(),
        paymentBreakdown: payments,
        orderTypeBreakdown: orderTypes,
      ));
    } catch (e, st) {
      AppLogger.error('Failed to load reports', error: e, stackTrace: st, name: 'ReportsNotifier');
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchReport();
  }
}

final reportsNotifierProvider = NotifierProvider<ReportsNotifier, AsyncValue<ReportData>>(() {
  return ReportsNotifier();
});

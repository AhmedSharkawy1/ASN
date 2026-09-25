import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

enum ReportRange { today, week, month, all }

extension ReportRangeDays on ReportRange {
  int get days => switch (this) {
        ReportRange.today => 1,
        ReportRange.week => 7,
        ReportRange.month => 30,
        ReportRange.all => 0,
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
  ReportRange build() => ReportRange.today;

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
      final startOfToday = DateTime(now.year, now.month, now.day, 0, 0, 0);
      final endOfToday = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);

      DateTime? rangeStart;
      DateTime? rangeEnd;

      if (range == ReportRange.today) {
        rangeStart = startOfToday;
        rangeEnd = endOfToday;
      } else if (range == ReportRange.week) {
        rangeStart = startOfToday.subtract(const Duration(days: 6));
        rangeEnd = endOfToday;
      } else if (range == ReportRange.month) {
        rangeStart = startOfToday.subtract(const Duration(days: 29));
        rangeEnd = endOfToday;
      } else if (range == ReportRange.all) {
        rangeStart = null;
        rangeEnd = null;
      }

      // Fetch all orders in batches of 1000 so nothing is truncated
      final List<dynamic> rawOrders = [];
      const int batchSize = 1000;
      int offset = 0;

      while (true) {
        var query = SupabaseClientManager.client
            .from('orders')
            .select('total, status, created_at, items, payment_method, order_type, is_draft')
            .eq('restaurant_id', restaurantId)
            .eq('is_draft', false);

        if (rangeStart != null) {
          query = query.gte('created_at', rangeStart.toUtc().toIso8601String());
        }
        if (rangeEnd != null) {
          query = query.lte('created_at', rangeEnd.toUtc().toIso8601String());
        }

        final response = await query
            .order('created_at', ascending: false)
            .range(offset, offset + batchSize - 1);

        final list = response as List;
        if (list.isEmpty) break;
        rawOrders.addAll(list);
        if (list.length < batchSize) break;
        offset += batchSize;
      }

      double totalRevenue = 0;
      int totalOrders = 0;
      int pendingOrders = 0;
      int cancelledOrders = 0;
      final Map<String, TopProduct> products = {};
      final Map<String, double> payments = {};
      final Map<String, int> orderTypes = {};

      // Trend buckets:
      // - today: 6 blocks of 4 hours each
      // - week: 7 daily blocks
      // - month: 30 daily blocks
      // - all: 6 monthly blocks ending at current month
      final int bucketCount;
      final List<String> trendLabels;

      if (range == ReportRange.today) {
        bucketCount = 6;
        trendLabels = List.generate(bucketCount, (i) => '${i * 4}');
      } else if (range == ReportRange.all) {
        bucketCount = 6;
        trendLabels = List.generate(bucketCount, (i) {
          final m = DateTime(now.year, now.month - (bucketCount - 1 - i), 1);
          return '${m.month}/${m.year.toString().substring(2)}';
        });
      } else {
        bucketCount = range.days;
        trendLabels = List.generate(bucketCount, (i) {
          final day = rangeStart!.add(Duration(days: i));
          return '${day.day}/${day.month}';
        });
      }

      final trend = List.filled(bucketCount, 0.0);

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

        // Trend bucket placement
        if (range == ReportRange.today) {
          final bucket = (createdAt.hour ~/ 4).clamp(0, bucketCount - 1);
          trend[bucket] += price;
        } else if (range == ReportRange.all) {
          final monthsDiff = (now.year - createdAt.year) * 12 + (now.month - createdAt.month);
          if (monthsDiff >= 0 && monthsDiff < bucketCount) {
            final bucket = (bucketCount - 1 - monthsDiff);
            trend[bucket] += price;
          }
        } else {
          final dayIndex = DateTime(createdAt.year, createdAt.month, createdAt.day)
              .difference(DateTime(rangeStart!.year, rangeStart.month, rangeStart.day))
              .inDays;
          if (dayIndex >= 0 && dayIndex < bucketCount) {
            trend[dayIndex] += price;
          }
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

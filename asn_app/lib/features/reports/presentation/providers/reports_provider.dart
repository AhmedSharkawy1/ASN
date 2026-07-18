import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class ReportData {
  final double todayRevenue;
  final int todayOrders;
  final int pendingOrders;
  final List<double> weekRevenue;

  ReportData({
    required this.todayRevenue,
    required this.todayOrders,
    required this.pendingOrders,
    required this.weekRevenue,
  });
}

class ReportsNotifier extends Notifier<AsyncValue<ReportData>> {
  @override
  AsyncValue<ReportData> build() {
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
      state = AsyncValue.data(ReportData(todayRevenue: 0, todayOrders: 0, pendingOrders: 0, weekRevenue: [0,0,0,0,0,0,0]));
      return;
    }

    try {
      final now = DateTime.now();
      final sevenDaysAgo = now.subtract(const Duration(days: 7));
      
      final response = await SupabaseClientManager.client
          .from('orders')
          .select('id, total_price, status, created_at')
          .eq('tenant_id', restaurantId)
          .gte('created_at', sevenDaysAgo.toIso8601String());

      final List<dynamic> rawOrders = response as List;
      
      double todayRev = 0;
      int todayOrd = 0;
      int pendingOrd = 0;
      final List<double> weekRev = List.filled(7, 0.0);

      for (final json in rawOrders) {
        final status = json['status'] as String;
        final price = (json['total_price'] as num).toDouble();
        final createdAt = DateTime.parse(json['created_at'] as String);
        
        if (status == 'pending') pendingOrd++;
        
        final diffDays = now.difference(createdAt).inDays;
        
        // Today's stats (completed only for revenue)
        if (diffDays == 0) {
          todayOrd++;
          if (status == 'completed') todayRev += price;
        }
        
        // Week's revenue trend (completed only)
        if (status == 'completed' && diffDays >= 0 && diffDays < 7) {
          // weekRev[6] is today, weekRev[0] is 6 days ago
          weekRev[6 - diffDays] += price;
        }
      }

      state = AsyncValue.data(ReportData(
        todayRevenue: todayRev,
        todayOrders: todayOrd,
        pendingOrders: pendingOrd,
        weekRevenue: weekRev,
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

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

/// Restaurant-level order settings, shared with the web dashboard.
///
/// Deliberately not stored on the device: the setting decides what status an
/// order is created with, so two phones must never disagree about it.
class OrderSettings {
  /// When on, an incoming website order is booked as completed and counted in
  /// the accounts and reports straight away. When off it arrives pending and
  /// staff walk it through pending → preparing → ready → completed.
  final bool autoApproveWebsiteOrders;

  const OrderSettings({this.autoApproveWebsiteOrders = false});

  OrderSettings copyWith({bool? autoApproveWebsiteOrders}) => OrderSettings(
        autoApproveWebsiteOrders:
            autoApproveWebsiteOrders ?? this.autoApproveWebsiteOrders,
      );
}

class OrderSettingsNotifier extends Notifier<AsyncValue<OrderSettings>> {
  static const String _column = 'auto_approve_website_orders';

  @override
  AsyncValue<OrderSettings> build() {
    // Re-read when a super admin switches into another restaurant.
    ref.watch(activeRestaurantIdProvider);
    _fetch();
    return const AsyncValue.loading();
  }

  String? get _restaurantId => ref.read(authNotifierProvider).maybeWhen(
        authenticated: (user) => user.restaurantId,
        orElse: () => null,
      );

  Future<void> _fetch() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data(OrderSettings());
      return;
    }

    try {
      final row = await SupabaseClientManager.client
          .from('restaurants')
          .select(_column)
          .eq('id', restaurantId)
          .single();

      state = AsyncValue.data(
        OrderSettings(autoApproveWebsiteOrders: row[_column] as bool? ?? false),
      );
    } catch (e, st) {
      AppLogger.error('Failed to load order settings',
          error: e, stackTrace: st, name: 'OrderSettings');
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetch();
  }

  Future<void> setAutoApprove(bool value) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('لا يوجد متجر مرتبط بالحساب');

    final previous = state.value ?? const OrderSettings();
    // Optimistic: the switch must not lag behind the finger.
    state = AsyncValue.data(previous.copyWith(autoApproveWebsiteOrders: value));

    try {
      await SupabaseClientManager.client
          .from('restaurants')
          .update({_column: value})
          .eq('id', restaurantId);
    } catch (e, st) {
      state = AsyncValue.data(previous);
      AppLogger.error('Failed to save order settings',
          error: e, stackTrace: st, name: 'OrderSettings');
      throw Exception('تعذّر حفظ الإعداد: $e');
    }
  }
}

final orderSettingsProvider =
    NotifierProvider<OrderSettingsNotifier, AsyncValue<OrderSettings>>(() {
  return OrderSettingsNotifier();
});

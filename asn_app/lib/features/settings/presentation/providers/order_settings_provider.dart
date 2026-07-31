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

  /// Shows a "call the waiter" button on the menu when a customer opens it
  /// from a table's QR code, and alerts this app naming the table.
  final bool waiterCallEnabled;

  const OrderSettings({
    this.autoApproveWebsiteOrders = false,
    this.waiterCallEnabled = false,
  });

  OrderSettings copyWith({bool? autoApproveWebsiteOrders, bool? waiterCallEnabled}) =>
      OrderSettings(
        autoApproveWebsiteOrders:
            autoApproveWebsiteOrders ?? this.autoApproveWebsiteOrders,
        waiterCallEnabled: waiterCallEnabled ?? this.waiterCallEnabled,
      );
}

class OrderSettingsNotifier extends Notifier<AsyncValue<OrderSettings>> {
  static const String _autoApproveColumn = 'auto_approve_website_orders';
  static const String _waiterCallColumn = 'waiter_call_enabled';

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
          .select('$_autoApproveColumn, $_waiterCallColumn')
          .eq('id', restaurantId)
          .single();

      state = AsyncValue.data(
        OrderSettings(
          autoApproveWebsiteOrders: row[_autoApproveColumn] as bool? ?? false,
          waiterCallEnabled: row[_waiterCallColumn] as bool? ?? false,
        ),
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

    await _save(
      column: _autoApproveColumn,
      value: value,
      optimistic: (s) => s.copyWith(autoApproveWebsiteOrders: value),
      restaurantId: restaurantId,
    );
  }

  Future<void> setWaiterCallEnabled(bool value) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('لا يوجد متجر مرتبط بالحساب');

    await _save(
      column: _waiterCallColumn,
      value: value,
      optimistic: (s) => s.copyWith(waiterCallEnabled: value),
      restaurantId: restaurantId,
    );
  }

  /// Writes one flag, showing it immediately and rolling back if the write
  /// fails — a switch that stays flipped after a failed save is a lie.
  Future<void> _save({
    required String column,
    required bool value,
    required OrderSettings Function(OrderSettings) optimistic,
    required String restaurantId,
  }) async {
    final previous = state.value ?? const OrderSettings();
    state = AsyncValue.data(optimistic(previous));

    try {
      await SupabaseClientManager.client
          .from('restaurants')
          .update({column: value})
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

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/delivery/data/models/delivery_zone_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class DeliveryZonesNotifier extends Notifier<AsyncValue<List<DeliveryZoneModel>>> {
  @override
  AsyncValue<List<DeliveryZoneModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetchZones();
    return const AsyncValue.loading();
  }

  String? get _restaurantId {
    final authState = ref.read(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );
  }

  Future<void> _fetchZones() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final response = await SupabaseClientManager.client
          .from('delivery_zones')
          .select()
          .eq('restaurant_id', restaurantId)
          .order('name_ar', ascending: true);

      final zones = (response as List)
          .map((json) => DeliveryZoneModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(zones);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load delivery zones', error: e, stackTrace: stackTrace, name: 'DeliveryZonesProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchZones();
  }

  Future<void> toggleActive(String zoneId, bool currentStatus) async {
    try {
      await SupabaseClientManager.client
          .from('delivery_zones')
          .update({'is_active': !currentStatus})
          .eq('id', zoneId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle delivery zone', error: e, stackTrace: stackTrace, name: 'DeliveryZonesProvider');
      throw Exception('Failed to update zone: $e');
    }
  }

  Future<void> addZone({
    required String nameAr,
    String? nameEn,
    required double fee,
    required double minOrder,
    required int estimatedTime,
  }) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      await SupabaseClientManager.client.from('delivery_zones').insert({
        'restaurant_id': restaurantId,
        'name_ar': nameAr,
        'name_en': nameEn,
        'fee': fee,
        'min_order': minOrder,
        'estimated_time': estimatedTime,
      });
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add delivery zone', error: e, stackTrace: stackTrace, name: 'DeliveryZonesProvider');
      throw Exception('Failed to add zone: $e');
    }
  }

  Future<void> updateZone({
    required String zoneId,
    required String nameAr,
    String? nameEn,
    required double fee,
    required double minOrder,
    required int estimatedTime,
  }) async {
    try {
      await SupabaseClientManager.client
          .from('delivery_zones')
          .update({
            'name_ar': nameAr,
            'name_en': nameEn,
            'fee': fee,
            'min_order': minOrder,
            'estimated_time': estimatedTime,
          })
          .eq('id', zoneId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update delivery zone', error: e, stackTrace: stackTrace, name: 'DeliveryZonesProvider');
      throw Exception('Failed to update zone: $e');
    }
  }

  Future<void> deleteZone(String zoneId) async {
    try {
      await SupabaseClientManager.client.from('delivery_zones').delete().eq('id', zoneId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete delivery zone', error: e, stackTrace: stackTrace, name: 'DeliveryZonesProvider');
      throw Exception('Failed to delete zone: $e');
    }
  }
}

final deliveryZonesNotifierProvider =
    NotifierProvider<DeliveryZonesNotifier, AsyncValue<List<DeliveryZoneModel>>>(() {
  return DeliveryZonesNotifier();
});

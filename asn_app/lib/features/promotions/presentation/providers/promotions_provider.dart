import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/promotions/data/models/promotion_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class PromotionsNotifier extends Notifier<AsyncValue<List<PromotionModel>>> {
  @override
  AsyncValue<List<PromotionModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetchPromotions();
    return const AsyncValue.loading();
  }

  String? get _restaurantId {
    final authState = ref.read(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );
  }

  Future<void> _fetchPromotions() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final response = await SupabaseClientManager.client
          .from('promotions')
          .select()
          .eq('restaurant_id', restaurantId)
          .order('created_at', ascending: false);

      final promotions = (response as List)
          .map((json) => PromotionModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(promotions);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load promotions', error: e, stackTrace: stackTrace, name: 'PromotionsProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchPromotions();
  }

  Future<void> toggleActive(String promoId, bool currentStatus) async {
    try {
      await SupabaseClientManager.client
          .from('promotions')
          .update({'is_active': !currentStatus})
          .eq('id', promoId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle promotion', error: e, stackTrace: stackTrace, name: 'PromotionsProvider');
      throw Exception('Failed to update promotion: $e');
    }
  }

  Future<void> addPromotion({
    required String nameAr,
    String? nameEn,
    String? descriptionAr,
    required String discountType,
    required double discountValue,
    required double minOrderAmount,
    DateTime? startsAt,
    DateTime? endsAt,
  }) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      await SupabaseClientManager.client.from('promotions').insert({
        'restaurant_id': restaurantId,
        'name_ar': nameAr,
        'name_en': nameEn,
        'description_ar': descriptionAr,
        'discount_type': discountType,
        'discount_value': discountValue,
        'required_items': <Map<String, dynamic>>[],
        'min_order_amount': minOrderAmount,
        'starts_at': startsAt?.toIso8601String(),
        'ends_at': endsAt?.toIso8601String(),
      });
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add promotion', error: e, stackTrace: stackTrace, name: 'PromotionsProvider');
      throw Exception('Failed to add promotion: $e');
    }
  }

  Future<void> updatePromotion({
    required String promoId,
    required String nameAr,
    String? nameEn,
    String? descriptionAr,
    required String discountType,
    required double discountValue,
    required double minOrderAmount,
    DateTime? startsAt,
    DateTime? endsAt,
  }) async {
    try {
      await SupabaseClientManager.client
          .from('promotions')
          .update({
            'name_ar': nameAr,
            'name_en': nameEn,
            'description_ar': descriptionAr,
            'discount_type': discountType,
            'discount_value': discountValue,
            'min_order_amount': minOrderAmount,
            'starts_at': startsAt?.toIso8601String(),
            'ends_at': endsAt?.toIso8601String(),
          })
          .eq('id', promoId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update promotion', error: e, stackTrace: stackTrace, name: 'PromotionsProvider');
      throw Exception('Failed to update promotion: $e');
    }
  }

  Future<void> deletePromotion(String promoId) async {
    try {
      await SupabaseClientManager.client.from('promotions').delete().eq('id', promoId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete promotion', error: e, stackTrace: stackTrace, name: 'PromotionsProvider');
      throw Exception('Failed to delete promotion: $e');
    }
  }
}

final promotionsNotifierProvider =
    NotifierProvider<PromotionsNotifier, AsyncValue<List<PromotionModel>>>(() {
  return PromotionsNotifier();
});

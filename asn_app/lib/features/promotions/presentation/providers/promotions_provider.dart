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

  /// Builds the `required_items` payload the checkout engine reads.
  ///
  /// The engine ignores any promotion whose list is empty, so a promotion
  /// saved without a target would silently never fire. Callers must pick
  /// either the whole menu or at least one item.
  static List<Map<String, dynamic>> _buildTarget({
    required bool allItems,
    required List<PromotionItem> items,
  }) {
    if (allItems) {
      return [
        const PromotionItem(
          itemId: PromotionModel.allItemsId,
          titleAr: 'كل الأصناف',
          titleEn: 'All items',
        ).toJson(),
      ];
    }
    return items.map((i) => i.toJson()).toList();
  }

  Future<void> addPromotion({
    required String nameAr,
    String? nameEn,
    String? descriptionAr,
    required String discountType,
    required double discountValue,
    required double minOrderAmount,
    required bool appliesToAllItems,
    List<PromotionItem> items = const [],
    String? promoCode,
    DateTime? startsAt,
    DateTime? endsAt,
  }) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    final target = _buildTarget(allItems: appliesToAllItems, items: items);
    if (target.isEmpty) throw Exception('اختر كل الأصناف أو صنفاً واحداً على الأقل');

    try {
      await SupabaseClientManager.client.from('promotions').insert({
        'restaurant_id': restaurantId,
        'name_ar': nameAr,
        'name_en': nameEn,
        'description_ar': descriptionAr,
        'discount_type': discountType,
        'discount_value': discountValue,
        'required_items': target,
        // Blank means no coupon, so normalise it to null rather than an empty
        // string the engine would treat as a code.
        'promo_code': (promoCode?.trim().isNotEmpty == true) ? promoCode!.trim() : null,
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
    required bool appliesToAllItems,
    List<PromotionItem> items = const [],
    String? promoCode,
    DateTime? startsAt,
    DateTime? endsAt,
  }) async {
    final target = _buildTarget(allItems: appliesToAllItems, items: items);
    if (target.isEmpty) throw Exception('اختر كل الأصناف أو صنفاً واحداً على الأقل');

    try {
      await SupabaseClientManager.client
          .from('promotions')
          .update({
            'name_ar': nameAr,
            'name_en': nameEn,
            'description_ar': descriptionAr,
            'discount_type': discountType,
            'discount_value': discountValue,
            'required_items': target,
            'promo_code': (promoCode?.trim().isNotEmpty == true) ? promoCode!.trim() : null,
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

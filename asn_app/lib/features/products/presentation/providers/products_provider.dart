import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

/// Encodes size variants back into the platform's storage format:
/// prices[] plus size_labels[] where a discounted size stores
/// `label::oldPrice` (mirrors the web dashboard's menu page).
({List<double> prices, List<String> labels}) encodeSizes(List<ProductSize> sizes) {
  final valid = sizes.where((s) => s.price > 0).toList();
  return (
    prices: valid.map((s) => s.price).toList(),
    labels: valid
        .map((s) => (s.oldPrice != null && s.oldPrice! > 0)
            ? '${s.label}::${_trimNum(s.oldPrice!)}'
            : s.label)
        .toList(),
  );
}

String _trimNum(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toString();

class ProductsNotifier extends Notifier<AsyncValue<List<ProductModel>>> {
  @override
  AsyncValue<List<ProductModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetchProducts();
    return const AsyncValue.loading();
  }

  String? get _restaurantId {
    final authState = ref.read(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );
  }

  Future<void> _fetchProducts() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      // First, fetch all category IDs for this restaurant
      final catsResponse = await SupabaseClientManager.client
          .from('categories')
          .select('id')
          .eq('restaurant_id', restaurantId);

      final catIds = (catsResponse as List).map((c) => c['id'] as String).toList();

      if (catIds.isEmpty) {
        state = const AsyncValue.data([]);
        return;
      }

      // Then, fetch all items belonging to those categories
      // Ascending + created_at tiebreaker: matches the web and keeps
      // positions stable when items share the same sort_order.
      final response = await SupabaseClientManager.client
          .from('items')
          .select()
          .inFilter('category_id', catIds)
          .order('sort_order', ascending: true)
          .order('created_at', ascending: true);

      final products = (response as List)
          .map((json) => ProductModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(products);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load products', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchProducts();
  }

  Future<void> toggleAvailability(String productId, bool currentStatus) async {
    try {
      await SupabaseClientManager.client
          .from('items')
          .update({'is_available': !currentStatus})
          .eq('id', productId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle product availability', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to update: $e');
    }
  }

  Map<String, dynamic> _payload({
    required String titleAr,
    String? titleEn,
    String? descAr,
    required List<ProductSize> sizes,
    String? imageUrl,
    required bool isAvailable,
    required bool isPopular,
    required bool isSpicy,
    String? categoryId,
  }) {
    final encoded = encodeSizes(sizes);
    final basePrice = encoded.prices.isNotEmpty ? encoded.prices.first : 0.0;
    return {
      'title_ar': titleAr,
      'title_en': (titleEn?.isNotEmpty == true) ? titleEn : titleAr,
      'desc_ar': descAr,
      'price': basePrice,
      'prices': encoded.prices,
      'size_labels': encoded.labels,
      'image_url': imageUrl,
      'is_available': isAvailable,
      'is_popular': isPopular,
      'is_spicy': isSpicy,
      'category_id': ?categoryId,
    };
  }

  Future<void> addProduct({
    required String titleAr,
    String? titleEn,
    String? descAr,
    required List<ProductSize> sizes,
    String? imageUrl,
    required String categoryId,
    bool isAvailable = true,
    bool isPopular = false,
    bool isSpicy = false,
  }) async {
    try {
      final count = state.value?.where((p) => p.categoryId == categoryId).length ?? 0;
      await SupabaseClientManager.client.from('items').insert({
        ..._payload(
          titleAr: titleAr,
          titleEn: titleEn,
          descAr: descAr,
          sizes: sizes,
          imageUrl: imageUrl,
          isAvailable: isAvailable,
          isPopular: isPopular,
          isSpicy: isSpicy,
          categoryId: categoryId,
        ),
        'sort_order': count,
      });
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to add product: $e');
    }
  }

  Future<void> updateProduct({
    required String productId,
    required String titleAr,
    String? titleEn,
    String? descAr,
    required List<ProductSize> sizes,
    String? imageUrl,
    String? categoryId,
    required bool isAvailable,
    required bool isPopular,
    required bool isSpicy,
  }) async {
    try {
      await SupabaseClientManager.client
          .from('items')
          .update(_payload(
            titleAr: titleAr,
            titleEn: titleEn,
            descAr: descAr,
            sizes: sizes,
            imageUrl: imageUrl,
            isAvailable: isAvailable,
            isPopular: isPopular,
            isSpicy: isSpicy,
            categoryId: categoryId,
          ))
          .eq('id', productId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to update product: $e');
    }
  }

  /// Persists a new manual order for a category's items (index = sort_order),
  /// mirroring the web dashboard's move up/down behavior.
  Future<void> reorderProducts(List<String> orderedIds) async {
    try {
      if (orderedIds.isEmpty) return;

      // Issue the updates concurrently rather than one-after-another: 50
      // products cost ~1 round trip instead of 50. Deliberately UPDATEs
      // rather than a single upsert — upsert would INSERT if an id were ever
      // missing, and these rows have NOT NULL columns we don't send here.
      await Future.wait([
        for (var i = 0; i < orderedIds.length; i++)
          SupabaseClientManager.client
              .from('items')
              .update({'sort_order': i})
              .eq('id', orderedIds[i]),
      ]);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to reorder products', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to reorder: $e');
    }
  }

  Future<void> deleteProduct(String productId) async {
    try {
      await SupabaseClientManager.client
          .from('items')
          .delete()
          .eq('id', productId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to delete product: $e');
    }
  }
}

final productsNotifierProvider = NotifierProvider<ProductsNotifier, AsyncValue<List<ProductModel>>>(() {
  return ProductsNotifier();
});

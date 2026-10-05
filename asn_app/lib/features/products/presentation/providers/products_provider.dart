import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/config/app_config.dart';
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

  /// Best-effort: purge the Next.js data cache for this restaurant's public
  /// menu so changes (images, prices, availability) are reflected immediately.
  void _triggerMenuRevalidation() {
    final rid = _restaurantId;
    if (rid == null) return;
    Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl))
        .post<void>('/api/revalidate-menu', data: {'restaurantId': rid})
        .catchError((_) {
      AppLogger.warning('Menu revalidation failed (non-fatal)', name: 'ProductsProvider');
      return Response<void>(requestOptions: RequestOptions());
    });
  }

  Future<void> _fetchProducts() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final catsResponse = await SupabaseClientManager.client
          .from('categories')
          .select('id')
          .eq('restaurant_id', restaurantId);

      final catIds = (catsResponse as List).map((c) => c['id'] as String).toList();

      if (catIds.isEmpty) {
        state = const AsyncValue.data([]);
        return;
      }

      // Exact order matching the web dashboard:
      // sort_order ASC, created_at ASC, id ASC
      final response = await SupabaseClientManager.client
          .from('items')
          .select()
          .inFilter('category_id', catIds)
          .order('sort_order', ascending: true)
          .order('created_at', ascending: true)
          .order('id', ascending: true);

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

  /// Helper to update a product in-place in local state, guaranteeing the list
  /// order NEVER shifts or scrambles when editing.
  void updateInPlace(String productId, ProductModel Function(ProductModel) transform) {
    if (!state.hasValue) return;
    final currentList = state.value!;
    final idx = currentList.indexWhere((p) => p.id == productId);
    if (idx != -1) {
      final nextList = List<ProductModel>.from(currentList);
      nextList[idx] = transform(currentList[idx]);
      state = AsyncValue.data(nextList);
    }
  }

  /// Bulk updates all items in a category to popular/unpopular
  void updateCategoryItemsPopular(String categoryId, bool isPopular) {
    if (!state.hasValue) return;
    final currentList = state.value!;
    final nextList = currentList.map((p) {
      if (p.categoryId == categoryId) {
        return p.copyWith(isPopular: isPopular);
      }
      return p;
    }).toList();
    state = AsyncValue.data(nextList);
  }

  Future<void> toggleAvailability(String productId, bool currentStatus) async {
    updateInPlace(productId, (p) => p.copyWith(isAvailable: !currentStatus));
    try {
      await SupabaseClientManager.client
          .from('items')
          .update({'is_available': !currentStatus})
          .eq('id', productId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle availability', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      updateInPlace(productId, (p) => p.copyWith(isAvailable: currentStatus));
      throw Exception('Failed to update: $e');
    }
  }

  Future<void> togglePopular(String productId, bool currentStatus) async {
    updateInPlace(productId, (p) => p.copyWith(isPopular: !currentStatus));
    try {
      await SupabaseClientManager.client
          .from('items')
          .update({'is_popular': !currentStatus})
          .eq('id', productId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle popular', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      updateInPlace(productId, (p) => p.copyWith(isPopular: currentStatus));
      throw Exception('Failed to update: $e');
    }
  }

  Future<void> toggleNew(String productId, bool currentStatus) async {
    updateInPlace(productId, (p) => p.copyWith(isNew: !currentStatus));
    try {
      await SupabaseClientManager.client
          .from('items')
          .update({'is_new': !currentStatus})
          .eq('id', productId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle is_new', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      updateInPlace(productId, (p) => p.copyWith(isNew: currentStatus));
      throw Exception('Failed to update: $e');
    }
  }

  Future<void> toggleSpicy(String productId, bool currentStatus) async {
    updateInPlace(productId, (p) => p.copyWith(isSpicy: !currentStatus));
    try {
      await SupabaseClientManager.client
          .from('items')
          .update({'is_spicy': !currentStatus})
          .eq('id', productId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle spicy', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      updateInPlace(productId, (p) => p.copyWith(isSpicy: currentStatus));
      throw Exception('Failed to update: $e');
    }
  }

  Future<void> toggleWeight(String productId, bool currentStatus, String? weightUnit) async {
    updateInPlace(productId, (p) => p.copyWith(
      sellByWeight: !currentStatus,
      weightUnit: !currentStatus ? (weightUnit ?? 'كجم') : null,
    ));
    try {
      await SupabaseClientManager.client
          .from('items')
          .update({
            'sell_by_weight': !currentStatus,
            'weight_unit': !currentStatus ? (weightUnit ?? 'كجم') : null,
          })
          .eq('id', productId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle weight', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      updateInPlace(productId, (p) => p.copyWith(sellByWeight: currentStatus));
      throw Exception('Failed to update: $e');
    }
  }

  Future<void> addProduct({
    required String titleAr,
    String? titleEn,
    String? descAr,
    String? descEn,
    required List<ProductSize> sizes,
    String? imageUrl,
    String? thumbnailUrl,
    required String categoryId,
    bool isAvailable = true,
    bool isPopular = false,
    bool isSpicy = false,
    bool isNew = false,
    bool sellByWeight = false,
    String? weightUnit,
  }) async {
    try {
      final count = state.value?.where((p) => p.categoryId == categoryId).length ?? 0;
      final encoded = encodeSizes(sizes);
      final basePrice = encoded.prices.isNotEmpty ? encoded.prices.first : 0.0;

      final res = await SupabaseClientManager.client.from('items').insert({
        'title_ar': titleAr,
        'title_en': (titleEn?.isNotEmpty == true) ? titleEn : titleAr,
        'desc_ar': descAr,
        'desc_en': descEn,
        'price': basePrice,
        'prices': encoded.prices,
        'size_labels': encoded.labels,
        'image_url': imageUrl,
        'thumbnail_url': thumbnailUrl,
        'is_available': isAvailable,
        'is_popular': isPopular,
        'is_spicy': isSpicy,
        'is_new': isNew,
        'sell_by_weight': sellByWeight,
        'weight_unit': sellByWeight ? weightUnit : null,
        'category_id': categoryId,
        'sort_order': count,
      }).select().single();

      final newProduct = ProductModel.fromJson(res);
      if (state.hasValue) {
        state = AsyncValue.data([...state.value!, newProduct]);
      }
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to add product: $e');
    }
  }

  /// Updates an item in place so the order is 100% PRESERVED and never shifts!
  Future<void> updateProduct({
    required String productId,
    required String titleAr,
    String? titleEn,
    String? descAr,
    String? descEn,
    required List<ProductSize> sizes,
    String? imageUrl,
    String? thumbnailUrl,
    String? categoryId,
    required bool isAvailable,
    required bool isPopular,
    required bool isSpicy,
    bool isNew = false,
    bool sellByWeight = false,
    String? weightUnit,
  }) async {
    final encoded = encodeSizes(sizes);
    final basePrice = encoded.prices.isNotEmpty ? encoded.prices.first : 0.0;

    // 1. Optimistic in-place state update: ensures position is preserved exactly!
    updateInPlace(productId, (old) => old.copyWith(
      titleAr: titleAr,
      titleEn: (titleEn?.isNotEmpty == true) ? titleEn : titleAr,
      descAr: descAr,
      descEn: descEn,
      price: basePrice,
      prices: encoded.prices,
      rawSizeLabels: encoded.labels,
      imageUrl: imageUrl ?? old.imageUrl,
      thumbnailUrl: thumbnailUrl ?? old.thumbnailUrl,
      categoryId: categoryId ?? old.categoryId,
      isAvailable: isAvailable,
      isPopular: isPopular,
      isSpicy: isSpicy,
      isNew: isNew,
      sellByWeight: sellByWeight,
      weightUnit: sellByWeight ? weightUnit : null,
    ));

    try {
      final payload = {
        'title_ar': titleAr,
        'title_en': (titleEn?.isNotEmpty == true) ? titleEn : titleAr,
        'desc_ar': descAr,
        'desc_en': descEn,
        'price': basePrice,
        'prices': encoded.prices,
        'size_labels': encoded.labels,
        'image_url': ?imageUrl,
        'thumbnail_url': ?thumbnailUrl,
        'is_available': isAvailable,
        'is_popular': isPopular,
        'is_spicy': isSpicy,
        'is_new': isNew,
        'sell_by_weight': sellByWeight,
        'weight_unit': sellByWeight ? weightUnit : null,
        'category_id': ?categoryId,
      };

      await SupabaseClientManager.client
          .from('items')
          .update(payload)
          .eq('id', productId);

      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      await refresh(); // Re-sync on failure
      throw Exception('Failed to update product: $e');
    }
  }

  /// Duplicates an item and inserts it right next to it, matching the web's duplicate feature.
  Future<void> duplicateProduct(ProductModel product) async {
    try {
      final newTitle = '${product.titleAr} (نسخة)';
      final response = await SupabaseClientManager.client.from('items').insert({
        'title_ar': newTitle,
        'title_en': product.titleEn != null ? '${product.titleEn} (Copy)' : null,
        'desc_ar': product.descAr,
        'desc_en': product.descEn,
        'price': product.price,
        'prices': product.prices,
        'size_labels': product.rawSizeLabels,
        'image_url': product.imageUrl,
        'thumbnail_url': product.thumbnailUrl,
        'is_available': product.isAvailable,
        'is_popular': product.isPopular,
        'is_spicy': product.isSpicy,
        'is_new': product.isNew,
        'sell_by_weight': product.sellByWeight,
        'weight_unit': product.weightUnit,
        'category_id': product.categoryId,
        'sort_order': product.sortOrder + 1,
      }).select().single();

      final newProduct = ProductModel.fromJson(response);
      if (state.hasValue) {
        final list = List<ProductModel>.from(state.value!);
        final idx = list.indexWhere((p) => p.id == product.id);
        if (idx != -1) {
          list.insert(idx + 1, newProduct);
        } else {
          list.add(newProduct);
        }
        state = AsyncValue.data(list);
      }
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to duplicate product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to duplicate: $e');
    }
  }

  /// Moves an item up or down within its category, updating sort_order in database.
  Future<void> moveItem(String categoryId, int itemIndex, String direction) async {
    if (!state.hasValue) return;
    final allProducts = List<ProductModel>.from(state.value!);
    final catItems = allProducts.where((p) => p.categoryId == categoryId).toList();
    if (catItems.isEmpty) return;

    if (direction == 'up' && itemIndex == 0) return;
    if (direction == 'down' && itemIndex == catItems.length - 1) return;

    final swapIndex = direction == 'up' ? itemIndex - 1 : itemIndex + 1;
    final temp = catItems[itemIndex];
    catItems[itemIndex] = catItems[swapIndex];
    catItems[swapIndex] = temp;

    // Apply new sort orders locally
    final idToIndex = {for (var i = 0; i < catItems.length; i++) catItems[i].id: i};
    final nextAll = allProducts.map((p) {
      if (p.categoryId == categoryId && idToIndex.containsKey(p.id)) {
        return p.copyWith(sortOrder: idToIndex[p.id]!);
      }
      return p;
    }).toList();

    // Keep state ordered by category and sort_order
    state = AsyncValue.data(nextAll);

    // Persist to Supabase
    try {
      await Future.wait([
        for (var i = 0; i < catItems.length; i++)
          SupabaseClientManager.client
              .from('items')
              .update({'sort_order': i})
              .eq('id', catItems[i].id),
      ]);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to move item', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
    }
  }

  Future<void> reorderProducts(List<String> orderedIds) async {
    try {
      if (orderedIds.isEmpty) return;
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
    if (state.hasValue) {
      state = AsyncValue.data(state.value!.where((p) => p.id != productId).toList());
    }
    try {
      await SupabaseClientManager.client
          .from('items')
          .delete()
          .eq('id', productId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      await refresh();
      throw Exception('Failed to delete product: $e');
    }
  }
}

final productsNotifierProvider = NotifierProvider<ProductsNotifier, AsyncValue<List<ProductModel>>>(() {
  return ProductsNotifier();
});

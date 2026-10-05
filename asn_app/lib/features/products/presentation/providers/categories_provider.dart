import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/config/app_config.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/products/data/models/category_model.dart';
import 'package:asn_app/features/products/presentation/providers/products_provider.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class CategoriesNotifier extends Notifier<AsyncValue<List<CategoryModel>>> {
  @override
  AsyncValue<List<CategoryModel>> build() {
    ref.watch(activeRestaurantIdProvider);
    _fetchCategories();
    return const AsyncValue.loading();
  }

  String? get _restaurantId {
    final authState = ref.read(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );
  }

  /// Purges Next.js public menu cache for this restaurant immediately
  void _triggerMenuRevalidation() {
    final rid = _restaurantId;
    if (rid == null) return;
    Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl))
        .post<void>('/api/revalidate-menu', data: {'restaurantId': rid})
        .catchError((_) {
      AppLogger.warning('Category revalidation failed (non-fatal)', name: 'CategoriesProvider');
      return Response<void>(requestOptions: RequestOptions());
    });
  }

  Future<void> _fetchCategories() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      // Matching web dashboard query order:
      // sort_order ASC, created_at ASC
      final response = await SupabaseClientManager.client
          .from('categories')
          .select()
          .eq('restaurant_id', restaurantId)
          .order('sort_order', ascending: true)
          .order('created_at', ascending: true);

      final categories = (response as List)
          .map((json) => CategoryModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(categories);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load categories', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchCategories();
  }

  void _updateInPlace(String categoryId, CategoryModel Function(CategoryModel) transform) {
    if (!state.hasValue) return;
    final currentList = state.value!;
    final idx = currentList.indexWhere((c) => c.id == categoryId);
    if (idx != -1) {
      final nextList = List<CategoryModel>.from(currentList);
      nextList[idx] = transform(currentList[idx]);
      state = AsyncValue.data(nextList);
    }
  }

  Future<void> addCategory(String nameAr, {String? nameEn, String? emoji}) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      final current = state.value ?? const <CategoryModel>[];
      final res = await SupabaseClientManager.client.from('categories').insert({
        'restaurant_id': restaurantId,
        'name_ar': nameAr,
        'name_en': nameEn ?? nameAr,
        'emoji': emoji,
        'sort_order': current.length,
      }).select().single();

      final newCategory = CategoryModel.fromJson(res);
      if (state.hasValue) {
        state = AsyncValue.data([...state.value!, newCategory]);
      }
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add category', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      throw Exception('Failed to add category: $e');
    }
  }

  Future<void> renameCategory(String categoryId, String nameAr, {String? nameEn, String? emoji}) async {
    _updateInPlace(categoryId, (c) => c.copyWith(
      nameAr: nameAr,
      nameEn: nameEn,
      emoji: emoji,
    ));
    try {
      await SupabaseClientManager.client
          .from('categories')
          .update({
            'name_ar': nameAr,
            'name_en': ?nameEn,
            'emoji': ?emoji,
          })
          .eq('id', categoryId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to rename category', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      await refresh();
      throw Exception('Failed to rename category: $e');
    }
  }

  Future<void> toggleCategoryAvailability(String categoryId, bool currentStatus) async {
    _updateInPlace(categoryId, (c) => c.copyWith(isAvailable: !currentStatus));
    try {
      await SupabaseClientManager.client
          .from('categories')
          .update({'is_available': !currentStatus})
          .eq('id', categoryId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle category availability', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      _updateInPlace(categoryId, (c) => c.copyWith(isAvailable: currentStatus));
    }
  }

  /// Toggles whole-category featured status and all its items (mirrors web toggleCategoryFeatured)
  Future<void> toggleCategoryFeatured(String categoryId, bool currentStatus) async {
    final targetState = !currentStatus;
    _updateInPlace(categoryId, (c) => c.copyWith(isPopular: targetState));

    // Also update all items of this category in the products notifier
    ref.read(productsNotifierProvider.notifier).updateCategoryItemsPopular(categoryId, targetState);

    final allProducts = ref.read(productsNotifierProvider).value ?? const [];
    final catItems = allProducts.where((p) => p.categoryId == categoryId).toList();

    try {
      if (catItems.isNotEmpty) {
        await SupabaseClientManager.client
            .from('items')
            .update({'is_popular': targetState})
            .inFilter('id', catItems.map((i) => i.id).toList());
      }
      try {
        await SupabaseClientManager.client
            .from('categories')
            .update({'is_popular': targetState})
            .eq('id', categoryId);
      } catch (_) {}
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle category featured', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      await refresh();
      await ref.read(productsNotifierProvider.notifier).refresh();
    }
  }

  /// Moves category up or down (mirrors web handleMoveCategory)
  Future<void> moveCategory(int index, String direction) async {
    if (!state.hasValue) return;
    final current = List<CategoryModel>.from(state.value!);
    if (direction == 'up' && index == 0) return;
    if (direction == 'down' && index == current.length - 1) return;

    final swapIndex = direction == 'up' ? index - 1 : index + 1;
    final temp = current[index];
    current[index] = current[swapIndex];
    current[swapIndex] = temp;

    final updatedList = [
      for (var i = 0; i < current.length; i++) current[i].copyWith(sortOrder: i)
    ];
    state = AsyncValue.data(updatedList);

    try {
      await Future.wait([
        for (var i = 0; i < updatedList.length; i++)
          SupabaseClientManager.client
              .from('categories')
              .update({'sort_order': i})
              .eq('id', updatedList[i].id),
      ]);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to move category', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      await refresh();
    }
  }

  Future<void> updateCategoryImage(String categoryId, String imageUrl, {String? thumbnailUrl}) async {
    _updateInPlace(categoryId, (c) => c.copyWith(
      imageUrl: imageUrl,
      thumbnailUrl: thumbnailUrl,
    ));
    try {
      await SupabaseClientManager.client
          .from('categories')
          .update({
            'image_url': imageUrl,
            'thumbnail_url': thumbnailUrl,
          })
          .eq('id', categoryId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update category image', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      await refresh();
      throw Exception('Failed to update category image: $e');
    }
  }

  Future<void> deleteCategory(String categoryId) async {
    if (state.hasValue) {
      state = AsyncValue.data(state.value!.where((c) => c.id != categoryId).toList());
    }
    try {
      await SupabaseClientManager.client
          .from('categories')
          .delete()
          .eq('id', categoryId);
      _triggerMenuRevalidation();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete category', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      await refresh();
      throw Exception('Failed to delete category: $e');
    }
  }
}

final categoriesNotifierProvider = NotifierProvider<CategoriesNotifier, AsyncValue<List<CategoryModel>>>(() {
  return CategoriesNotifier();
});

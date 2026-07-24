import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/products/data/models/category_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class CategoriesNotifier extends Notifier<AsyncValue<List<CategoryModel>>> {
  @override
  AsyncValue<List<CategoryModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
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

  Future<void> _fetchCategories() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final response = await SupabaseClientManager.client
          .from('categories')
          .select()
          .eq('restaurant_id', restaurantId)
          .order('sort_order', ascending: true);

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

  Future<void> addCategory(String nameAr, {String? nameEn, String? emoji}) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      final current = state.value ?? const <CategoryModel>[];
      await SupabaseClientManager.client.from('categories').insert({
        'restaurant_id': restaurantId,
        'name_ar': nameAr,
        'name_en': nameEn ?? nameAr,
        'emoji': ?emoji,
        'sort_order': current.length,
      });
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add category', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      throw Exception('Failed to add category: $e');
    }
  }

  Future<void> renameCategory(String categoryId, String nameAr, {String? nameEn, String? emoji}) async {
    try {
      await SupabaseClientManager.client
          .from('categories')
          .update({
            'name_ar': nameAr,
            if (nameEn != null && nameEn.isNotEmpty) 'name_en': nameEn,
            if (emoji != null && emoji.isNotEmpty) 'emoji': emoji,
          })
          .eq('id', categoryId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to rename category', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      throw Exception('Failed to rename category: $e');
    }
  }

  Future<void> updateCategoryImage(String categoryId, String imageUrl) async {
    try {
      await SupabaseClientManager.client
          .from('categories')
          .update({'image_url': imageUrl})
          .eq('id', categoryId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update category image', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      throw Exception('Failed to update category image: $e');
    }
  }

  Future<void> deleteCategory(String categoryId) async {
    try {
      await SupabaseClientManager.client.from('categories').delete().eq('id', categoryId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete category', error: e, stackTrace: stackTrace, name: 'CategoriesProvider');
      throw Exception('Failed to delete category: $e');
    }
  }
}

final categoriesNotifierProvider =
    NotifierProvider<CategoriesNotifier, AsyncValue<List<CategoryModel>>>(() {
  return CategoriesNotifier();
});

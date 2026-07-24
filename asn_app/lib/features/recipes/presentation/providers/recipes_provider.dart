import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/recipes/data/models/recipe_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class RecipesNotifier extends Notifier<AsyncValue<List<RecipeModel>>> {
  @override
  AsyncValue<List<RecipeModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetch();
    return const AsyncValue.loading();
  }

  String? get _restaurantId {
    final authState = ref.read(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );
  }

  Future<void> _fetch() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      // Recipes with their ingredients and each ingredient's inventory name
      final response = await SupabaseClientManager.client
          .from('recipes')
          .select('*, recipe_ingredients(*, inventory_items(name))')
          .eq('restaurant_id', restaurantId)
          .order('product_name', ascending: true);

      final recipes = (response as List)
          .map((json) => RecipeModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(recipes);
    } catch (e, st) {
      AppLogger.error('Failed to load recipes', error: e, stackTrace: st, name: 'RecipesProvider');
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetch();
  }

  Future<void> addRecipe({
    required String productName,
    double productCost = 0,
    String? notes,
    String? inventoryItemId,
  }) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      await SupabaseClientManager.client.from('recipes').insert({
        'restaurant_id': restaurantId,
        'product_name': productName,
        'product_cost': productCost,
        'notes': notes,
        'inventory_item_id': inventoryItemId,
      });
      await refresh();
    } catch (e, st) {
      AppLogger.error('Failed to add recipe', error: e, stackTrace: st, name: 'RecipesProvider');
      throw Exception('Failed to add recipe: $e');
    }
  }

  Future<void> updateRecipe({
    required String recipeId,
    required String productName,
    double productCost = 0,
    String? notes,
  }) async {
    try {
      await SupabaseClientManager.client
          .from('recipes')
          .update({
            'product_name': productName,
            'product_cost': productCost,
            'notes': notes,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', recipeId);
      await refresh();
    } catch (e, st) {
      AppLogger.error('Failed to update recipe', error: e, stackTrace: st, name: 'RecipesProvider');
      throw Exception('Failed to update recipe: $e');
    }
  }

  Future<void> deleteRecipe(String recipeId) async {
    try {
      await SupabaseClientManager.client.from('recipes').delete().eq('id', recipeId);
      await refresh();
    } catch (e, st) {
      AppLogger.error('Failed to delete recipe', error: e, stackTrace: st, name: 'RecipesProvider');
      throw Exception('Failed to delete recipe: $e');
    }
  }

  Future<void> addIngredient({
    required String recipeId,
    required String inventoryItemId,
    required double quantity,
    required String unit,
  }) async {
    try {
      await SupabaseClientManager.client.from('recipe_ingredients').insert({
        'recipe_id': recipeId,
        'inventory_item_id': inventoryItemId,
        'quantity': quantity,
        'unit': unit,
      });
      await refresh();
    } catch (e, st) {
      AppLogger.error('Failed to add ingredient', error: e, stackTrace: st, name: 'RecipesProvider');
      throw Exception('Failed to add ingredient: $e');
    }
  }

  Future<void> removeIngredient(String ingredientId) async {
    try {
      await SupabaseClientManager.client
          .from('recipe_ingredients')
          .delete()
          .eq('id', ingredientId);
      await refresh();
    } catch (e, st) {
      AppLogger.error('Failed to remove ingredient', error: e, stackTrace: st, name: 'RecipesProvider');
      throw Exception('Failed to remove ingredient: $e');
    }
  }
}

final recipesNotifierProvider =
    NotifierProvider<RecipesNotifier, AsyncValue<List<RecipeModel>>>(() {
  return RecipesNotifier();
});

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class ProductsNotifier extends Notifier<AsyncValue<List<ProductModel>>> {
  @override
  AsyncValue<List<ProductModel>> build() {
    _fetchProducts();
    return const AsyncValue.loading();
  }

  Future<void> _fetchProducts() async {
    final authState = ref.read(authNotifierProvider);
    final restaurantId = authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );

    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final response = await SupabaseClientManager.client
          .from('products')
          .select()
          .eq('tenant_id', restaurantId)
          .order('name');
          
      final products = (response as List).map((json) => ProductModel.fromJson(json as Map<String, dynamic>)).toList();
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
          .from('products')
          .update({'is_available': !currentStatus})
          .eq('id', productId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to toggle product availability', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to update: $e');
    }
  }
  Future<void> addProduct(String name, double price, String? description, String? imageUrl, bool isAvailable) async {
    final authState = ref.read(authNotifierProvider);
    final restaurantId = authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );

    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      await SupabaseClientManager.client.from('products').insert({
        'tenant_id': restaurantId,
        'name': name,
        'price': price,
        'description': description,
        'image_url': imageUrl,
        'is_available': isAvailable,
      });
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to add product: $e');
    }
  }

  Future<void> updateProduct(String productId, String name, double price, String? description, String? imageUrl, bool isAvailable) async {
    try {
      await SupabaseClientManager.client
          .from('products')
          .update({
            'name': name,
            'price': price,
            'description': description,
            'image_url': imageUrl,
            'is_available': isAvailable,
          })
          .eq('id', productId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update product', error: e, stackTrace: stackTrace, name: 'ProductsProvider');
      throw Exception('Failed to update product: $e');
    }
  }

  Future<void> deleteProduct(String productId) async {
    try {
      await SupabaseClientManager.client
          .from('products')
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

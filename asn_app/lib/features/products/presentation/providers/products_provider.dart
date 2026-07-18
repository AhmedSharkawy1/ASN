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
}

final productsNotifierProvider = NotifierProvider<ProductsNotifier, AsyncValue<List<ProductModel>>>(() {
  return ProductsNotifier();
});

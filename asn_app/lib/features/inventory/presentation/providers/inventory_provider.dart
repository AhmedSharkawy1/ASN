import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/inventory/data/models/inventory_item_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class InventoryNotifier extends Notifier<AsyncValue<List<InventoryItemModel>>> {
  @override
  AsyncValue<List<InventoryItemModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetchItems();
    return const AsyncValue.loading();
  }

  String? get _restaurantId {
    final authState = ref.read(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );
  }

  Future<void> _fetchItems() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final response = await SupabaseClientManager.client
          .from('inventory_items')
          .select()
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .order('name', ascending: true);

      final items = (response as List)
          .map((json) => InventoryItemModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(items);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load inventory', error: e, stackTrace: stackTrace, name: 'InventoryProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchItems();
  }

  Future<void> adjustQuantity(String itemId, double newQuantity) async {
    if (newQuantity < 0) newQuantity = 0;
    try {
      await SupabaseClientManager.client
          .from('inventory_items')
          .update({'quantity': newQuantity, 'updated_at': DateTime.now().toIso8601String()})
          .eq('id', itemId);
      // Update state in place to keep the UI responsive without a full reload
      state = state.whenData((items) => [
            for (final item in items)
              if (item.id == itemId)
                InventoryItemModel(
                  id: item.id,
                  name: item.name,
                  quantity: newQuantity,
                  unit: item.unit,
                  minimumStock: item.minimumStock,
                  itemType: item.itemType,
                  costPerUnit: item.costPerUnit,
                  currency: item.currency,
                  supplier: item.supplier,
                  category: item.category,
                  isActive: item.isActive,
                  expiryDate: item.expiryDate,
                )
              else
                item
          ]);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to adjust quantity', error: e, stackTrace: stackTrace, name: 'InventoryProvider');
      throw Exception('Failed to adjust quantity: $e');
    }
  }

  Future<void> addItem({
    required String name,
    required double quantity,
    required String unit,
    required double minimumStock,
    double costPerUnit = 0,
    String? supplier,
    String? category,
  }) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      await SupabaseClientManager.client.from('inventory_items').insert({
        'restaurant_id': restaurantId,
        'name': name,
        'quantity': quantity,
        'unit': unit,
        'minimum_stock': minimumStock,
        'cost_per_unit': costPerUnit,
        'supplier': supplier,
        'category': category,
      });
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add inventory item', error: e, stackTrace: stackTrace, name: 'InventoryProvider');
      throw Exception('Failed to add item: $e');
    }
  }

  Future<void> updateItem({
    required String itemId,
    required String name,
    required double quantity,
    required String unit,
    required double minimumStock,
    double costPerUnit = 0,
    String? supplier,
    String? category,
  }) async {
    try {
      await SupabaseClientManager.client
          .from('inventory_items')
          .update({
            'name': name,
            'quantity': quantity,
            'unit': unit,
            'minimum_stock': minimumStock,
            'cost_per_unit': costPerUnit,
            'supplier': supplier,
            'category': category,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', itemId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update inventory item', error: e, stackTrace: stackTrace, name: 'InventoryProvider');
      throw Exception('Failed to update item: $e');
    }
  }

  Future<void> deleteItem(String itemId) async {
    try {
      // Soft-delete to preserve history in inventory_transactions
      await SupabaseClientManager.client
          .from('inventory_items')
          .update({'is_active': false})
          .eq('id', itemId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete inventory item', error: e, stackTrace: stackTrace, name: 'InventoryProvider');
      throw Exception('Failed to delete item: $e');
    }
  }
}

final inventoryNotifierProvider =
    NotifierProvider<InventoryNotifier, AsyncValue<List<InventoryItemModel>>>(() {
  return InventoryNotifier();
});

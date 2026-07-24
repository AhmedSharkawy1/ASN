import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/tables/data/models/table_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class TablesNotifier extends Notifier<AsyncValue<List<TableModel>>> {
  @override
  AsyncValue<List<TableModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetchTables();
    return const AsyncValue.loading();
  }

  String? get _restaurantId {
    final authState = ref.read(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );
  }

  Future<void> _fetchTables() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final response = await SupabaseClientManager.client
          .from('tables')
          .select()
          .eq('restaurant_id', restaurantId)
          .order('label', ascending: true);

      final tables = (response as List)
          .map((json) => TableModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(tables);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load tables', error: e, stackTrace: stackTrace, name: 'TablesProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchTables();
  }

  Future<void> updateStatus(String tableId, String status) async {
    try {
      final payload = <String, dynamic>{'status': status};
      // Clearing a table also releases its linked order
      if (status == 'available') {
        payload['current_order_id'] = null;
        payload['merged_with'] = null;
      }
      await SupabaseClientManager.client.from('tables').update(payload).eq('id', tableId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update table status', error: e, stackTrace: stackTrace, name: 'TablesProvider');
      throw Exception('Failed to update table: $e');
    }
  }

  Future<void> addTable(String label, int capacity) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      await SupabaseClientManager.client.from('tables').insert({
        'restaurant_id': restaurantId,
        'label': label,
        'capacity': capacity,
      });
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add table', error: e, stackTrace: stackTrace, name: 'TablesProvider');
      throw Exception('Failed to add table: $e');
    }
  }

  Future<void> updateTable(String tableId, String label, int capacity) async {
    try {
      await SupabaseClientManager.client
          .from('tables')
          .update({'label': label, 'capacity': capacity})
          .eq('id', tableId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update table', error: e, stackTrace: stackTrace, name: 'TablesProvider');
      throw Exception('Failed to update table: $e');
    }
  }

  Future<void> deleteTable(String tableId) async {
    try {
      await SupabaseClientManager.client.from('tables').delete().eq('id', tableId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete table', error: e, stackTrace: stackTrace, name: 'TablesProvider');
      throw Exception('Failed to delete table: $e');
    }
  }
}

final tablesNotifierProvider = NotifierProvider<TablesNotifier, AsyncValue<List<TableModel>>>(() {
  return TablesNotifier();
});

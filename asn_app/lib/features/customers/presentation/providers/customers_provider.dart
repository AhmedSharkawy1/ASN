import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/customers/data/models/customer_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class CustomersNotifier extends Notifier<AsyncValue<List<CustomerModel>>> {
  @override
  AsyncValue<List<CustomerModel>> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetchCustomers();
    return const AsyncValue.loading();
  }

  String? get _restaurantId {
    final authState = ref.read(authNotifierProvider);
    return authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );
  }

  Future<void> _fetchCustomers() async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) {
      state = const AsyncValue.data([]);
      return;
    }

    try {
      final response = await SupabaseClientManager.client
          .from('customers')
          .select()
          .eq('restaurant_id', restaurantId)
          .order('created_at', ascending: false);

      final customers = (response as List)
          .map((json) => CustomerModel.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(customers);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to load customers', error: e, stackTrace: stackTrace, name: 'CustomersProvider');
      state = AsyncValue.error(e, stackTrace);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetchCustomers();
  }

  Future<void> addCustomer({
    required String name,
    String? phone,
    String? address,
    String? notes,
  }) async {
    final restaurantId = _restaurantId;
    if (restaurantId == null) throw Exception('User not authenticated or missing restaurant ID');

    try {
      await SupabaseClientManager.client.from('customers').insert({
        'restaurant_id': restaurantId,
        'name': name,
        'phone': phone,
        'address': address,
        'notes': notes,
      });
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to add customer', error: e, stackTrace: stackTrace, name: 'CustomersProvider');
      throw Exception('Failed to add customer: $e');
    }
  }

  Future<void> updateCustomer({
    required String customerId,
    required String name,
    String? phone,
    String? address,
    String? notes,
  }) async {
    try {
      await SupabaseClientManager.client
          .from('customers')
          .update({
            'name': name,
            'phone': phone,
            'address': address,
            'notes': notes,
          })
          .eq('id', customerId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update customer', error: e, stackTrace: stackTrace, name: 'CustomersProvider');
      throw Exception('Failed to update customer: $e');
    }
  }

  Future<void> deleteCustomer(String customerId) async {
    try {
      await SupabaseClientManager.client.from('customers').delete().eq('id', customerId);
      await refresh();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete customer', error: e, stackTrace: stackTrace, name: 'CustomersProvider');
      throw Exception('Failed to delete customer: $e');
    }
  }
}

final customersNotifierProvider =
    NotifierProvider<CustomersNotifier, AsyncValue<List<CustomerModel>>>(() {
  return CustomersNotifier();
});

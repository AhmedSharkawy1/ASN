import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:asn_app/core/error/exceptions.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/orders/data/models/order_model.dart';

abstract class OrdersRemoteDataSource {
  Future<List<OrderModel>> getOrders(String restaurantId, {String? branchId, String? status});
  Future<void> updateOrderStatus(String orderId, String status);
  Stream<OrderModel> subscribeToNewOrders(String restaurantId, {String? branchId});
}

class OrdersRemoteDataSourceImpl implements OrdersRemoteDataSource {
  final SupabaseClient _supabaseClient;

  OrdersRemoteDataSourceImpl() : _supabaseClient = SupabaseClientManager.client;

  // Selection string for joined order details
  static const String _orderSelect = '*, order_items(*, products(name))';

  @override
  Future<List<OrderModel>> getOrders(
    String restaurantId, {
    String? branchId,
    String? status,
  }) async {
    try {
      var query = _supabaseClient
          .from('orders')
          .select(_orderSelect)
          .eq('restaurant_id', restaurantId);

      if (branchId != null && branchId != 'all') {
        query = query.eq('branch_id', branchId);
      }

      if (status != null && status.isNotEmpty) {
        query = query.eq('status', status);
      }

      final response = await query.order('created_at', ascending: false);
      
      final list = response as List;
      return list.map((json) => OrderModel.fromJson(json as Map<String, dynamic>)).toList();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to get orders from Supabase', error: e, stackTrace: stackTrace, name: 'OrdersRemote');
      throw ServerException(e.toString());
    }
  }

  @override
  Future<void> updateOrderStatus(String orderId, String status) async {
    try {
      await _supabaseClient
          .from('orders')
          .update({'status': status})
          .eq('id', orderId);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to update order status in Supabase', error: e, stackTrace: stackTrace, name: 'OrdersRemote');
      throw ServerException(e.toString());
    }
  }

  @override
  Stream<OrderModel> subscribeToNewOrders(String restaurantId, {String? branchId}) {
    final controller = StreamController<OrderModel>.broadcast();
    
    AppLogger.info('Initializing Supabase Realtime channel for orders...', name: 'OrdersRemote');

    final channel = _supabaseClient.channel('orders_realtime_channel_${DateTime.now().millisecondsSinceEpoch}');

    channel.onPostgresChanges(
      event: PostgresChangeEvent.insert,
      schema: 'public',
      table: 'orders',
      filter: PostgresChangeFilter(
        type: PostgresChangeFilterType.eq,
        column: 'restaurant_id',
        value: restaurantId,
      ),
      callback: (PostgresChangePayload payload) async {
        try {
          final newRecord = payload.newRecord;
          final orderId = newRecord['id'] as String;
          final orderBranchId = newRecord['branch_id'] as String?;

          // Filter by branch_id in-memory if specified
          if (branchId != null && branchId != 'all' && orderBranchId != branchId) {
            return;
          }

          AppLogger.info('New order PostgresChange insert event detected: $orderId', name: 'OrdersRemote');

          // Fetch complete order with all joins
          final fullOrderData = await _supabaseClient
              .from('orders')
              .select(_orderSelect)
              .eq('id', orderId)
              .single();

          final orderModel = OrderModel.fromJson(fullOrderData);
          controller.add(orderModel);
        } catch (e, stackTrace) {
          AppLogger.error('Error handling PostgresChange order callback', error: e, stackTrace: stackTrace, name: 'OrdersRemote');
        }
      },
    );

    channel.subscribe((status, [error]) {
      AppLogger.info('Realtime channel subscription status: $status', name: 'OrdersRemote');
      if (error != null) {
        AppLogger.error('Realtime subscription error occurred', error: error, name: 'OrdersRemote');
      }
    });

    controller.onCancel = () {
      AppLogger.info('Unsubscribing from orders Realtime channel', name: 'OrdersRemote');
      _supabaseClient.removeChannel(channel);
      controller.close();
    };

    return controller.stream;
  }
}

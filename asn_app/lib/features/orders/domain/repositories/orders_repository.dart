import 'package:asn_app/features/orders/domain/entities/order_entity.dart';

abstract class OrdersRepository {
  Future<List<OrderEntity>> getOrders(String restaurantId, {String? branchId, String? status});
  Future<void> updateOrderStatus(String orderId, String status);
  Stream<OrderEntity> subscribeToNewOrders(String restaurantId, {String? branchId});
}

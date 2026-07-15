import 'package:asn_app/features/orders/domain/entities/order_entity.dart';
import 'package:asn_app/features/orders/domain/repositories/orders_repository.dart';
import 'package:asn_app/features/orders/data/datasources/orders_remote_datasource.dart';

class OrdersRepositoryImpl implements OrdersRepository {
  final OrdersRemoteDataSource _remoteDataSource;

  OrdersRepositoryImpl(this._remoteDataSource);

  @override
  Future<List<OrderEntity>> getOrders(
    String restaurantId, {
    String? branchId,
    String? status,
  }) async {
    final models = await _remoteDataSource.getOrders(restaurantId, branchId: branchId, status: status);
    return models.map((model) => model.toEntity()).toList();
  }

  @override
  Future<void> updateOrderStatus(String orderId, String status) {
    return _remoteDataSource.updateOrderStatus(orderId, status);
  }

  @override
  Stream<OrderEntity> subscribeToNewOrders(String restaurantId, {String? branchId}) {
    return _remoteDataSource
        .subscribeToNewOrders(restaurantId, branchId: branchId)
        .map((model) => model.toEntity());
  }
}

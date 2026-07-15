import 'package:asn_app/features/orders/domain/entities/order_entity.dart';
import 'package:asn_app/features/orders/domain/repositories/orders_repository.dart';

class SubscribeNewOrdersUseCase {
  final OrdersRepository _repository;

  SubscribeNewOrdersUseCase(this._repository);

  Stream<OrderEntity> call(String restaurantId, {String? branchId}) {
    return _repository.subscribeToNewOrders(restaurantId, branchId: branchId);
  }
}

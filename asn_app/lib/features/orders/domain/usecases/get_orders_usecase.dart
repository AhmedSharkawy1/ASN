import 'package:asn_app/features/orders/domain/entities/order_entity.dart';
import 'package:asn_app/features/orders/domain/repositories/orders_repository.dart';

class GetOrdersUseCase {
  final OrdersRepository _repository;

  GetOrdersUseCase(this._repository);

  Future<List<OrderEntity>> call(String restaurantId, {String? branchId, String? status}) {
    return _repository.getOrders(restaurantId, branchId: branchId, status: status);
  }
}

import 'package:asn_app/features/orders/domain/repositories/orders_repository.dart';

class UpdateOrderStatusUseCase {
  final OrdersRepository _repository;

  UpdateOrderStatusUseCase(this._repository);

  Future<void> call(String orderId, String status) {
    return _repository.updateOrderStatus(orderId, status);
  }
}

import 'package:freezed_annotation/freezed_annotation.dart';

part 'order_entity.freezed.dart';

@freezed
abstract class OrderItemEntity with _$OrderItemEntity {
  const factory OrderItemEntity({
    required String id,
    required String productId,
    required String productName,
    required int quantity,
    required double price,
    required List<Map<String, dynamic>> addons,
  }) = _OrderItemEntity;
}

@freezed
abstract class OrderEntity with _$OrderEntity {
  const factory OrderEntity({
    required String id,
    required String restaurantId,
    required String? branchId,
    required String orderNumber,
    required String status,
    required double totalPrice,
    required DateTime createdAt,
    required String paymentMethod,
    required String? customerName,
    required String? customerPhone,
    required String? customerAddress,
    required String? notes,
    required List<OrderItemEntity> items,
  }) = _OrderEntity;
}

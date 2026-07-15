// ignore_for_file: invalid_annotation_target

import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:asn_app/features/orders/domain/entities/order_entity.dart';

part 'order_model.freezed.dart';
part 'order_model.g.dart';

@freezed
abstract class OrderItemModel with _$OrderItemModel {
  const OrderItemModel._();

  const factory OrderItemModel({
    required String id,
    @JsonKey(name: 'product_id') required String productId,
    @JsonKey(name: 'products') required Map<String, dynamic>? productInfo,
    required int quantity,
    required double price,
    required List<Map<String, dynamic>>? addons,
  }) = _OrderItemModel;

  factory OrderItemModel.fromJson(Map<String, dynamic> json) => _$OrderItemModelFromJson(json);

  OrderItemEntity toEntity() {
    final productName = productInfo?['name'] as String? ?? 'Product';
    return OrderItemEntity(
      id: id,
      productId: productId,
      productName: productName,
      quantity: quantity,
      price: price,
      addons: addons ?? [],
    );
  }
}

@freezed
abstract class OrderModel with _$OrderModel {
  const OrderModel._();

  const factory OrderModel({
    required String id,
    @JsonKey(name: 'restaurant_id') required String restaurantId,
    @JsonKey(name: 'branch_id') required String? branchId,
    @JsonKey(name: 'order_number') required String orderNumber,
    required String status,
    @JsonKey(name: 'total_price') required double totalPrice,
    @JsonKey(name: 'created_at') required String createdAt,
    @JsonKey(name: 'payment_method') required String paymentMethod,
    @JsonKey(name: 'customer_name') required String? customerName,
    @JsonKey(name: 'customer_phone') required String? customerPhone,
    @JsonKey(name: 'customer_address') required String? customerAddress,
    required String? notes,
    @JsonKey(name: 'order_items') required List<OrderItemModel>? items,
  }) = _OrderModel;

  factory OrderModel.fromJson(Map<String, dynamic> json) => _$OrderModelFromJson(json);

  OrderEntity toEntity() {
    return OrderEntity(
      id: id,
      restaurantId: restaurantId,
      branchId: branchId,
      orderNumber: orderNumber,
      status: status,
      totalPrice: totalPrice,
      createdAt: DateTime.parse(createdAt),
      paymentMethod: paymentMethod,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
      notes: notes,
      items: items?.map((i) => i.toEntity()).toList() ?? const [],
    );
  }
}

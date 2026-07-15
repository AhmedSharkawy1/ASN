// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_OrderItemModel _$OrderItemModelFromJson(Map<String, dynamic> json) =>
    _OrderItemModel(
      id: json['id'] as String,
      productId: json['product_id'] as String,
      productInfo: json['products'] as Map<String, dynamic>?,
      quantity: (json['quantity'] as num).toInt(),
      price: (json['price'] as num).toDouble(),
      addons: (json['addons'] as List<dynamic>?)
          ?.map((e) => e as Map<String, dynamic>)
          .toList(),
    );

Map<String, dynamic> _$OrderItemModelToJson(_OrderItemModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'product_id': instance.productId,
      'products': instance.productInfo,
      'quantity': instance.quantity,
      'price': instance.price,
      'addons': instance.addons,
    };

_OrderModel _$OrderModelFromJson(Map<String, dynamic> json) => _OrderModel(
  id: json['id'] as String,
  restaurantId: json['restaurant_id'] as String,
  branchId: json['branch_id'] as String?,
  orderNumber: json['order_number'] as String,
  status: json['status'] as String,
  totalPrice: (json['total_price'] as num).toDouble(),
  createdAt: json['created_at'] as String,
  paymentMethod: json['payment_method'] as String,
  customerName: json['customer_name'] as String?,
  customerPhone: json['customer_phone'] as String?,
  customerAddress: json['customer_address'] as String?,
  notes: json['notes'] as String?,
  items: (json['order_items'] as List<dynamic>?)
      ?.map((e) => OrderItemModel.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$OrderModelToJson(_OrderModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'restaurant_id': instance.restaurantId,
      'branch_id': instance.branchId,
      'order_number': instance.orderNumber,
      'status': instance.status,
      'total_price': instance.totalPrice,
      'created_at': instance.createdAt,
      'payment_method': instance.paymentMethod,
      'customer_name': instance.customerName,
      'customer_phone': instance.customerPhone,
      'customer_address': instance.customerAddress,
      'notes': instance.notes,
      'order_items': instance.items,
    };

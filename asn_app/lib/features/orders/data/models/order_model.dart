import 'package:asn_app/features/orders/domain/entities/order_entity.dart';

/// Order item from the orders.items jsonb column.
///
/// Two shapes exist in production:
///  - web menu/checkout: {id, title, qty, size, price, category}
///  - mobile POS:        {id, product_id, product_name, quantity, price}
/// This parser accepts both.
class OrderItemModel {
  final String? id;
  final String? title;
  final int quantity;
  final double price;
  final String? size;
  final String? category;
  final List<Map<String, dynamic>> addons;

  const OrderItemModel({
    this.id,
    this.title,
    this.quantity = 1,
    this.price = 0,
    this.size,
    this.category,
    this.addons = const [],
  });

  factory OrderItemModel.fromJson(Map<String, dynamic> json) {
    return OrderItemModel(
      id: json['id']?.toString(),
      title: (json['title'] ?? json['product_name'])?.toString(),
      quantity: ((json['qty'] ?? json['quantity']) as num? ?? 1).toInt(),
      price: (json['price'] as num? ?? 0).toDouble(),
      size: json['size']?.toString(),
      category: json['category']?.toString(),
      addons: (json['addons'] as List?)?.whereType<Map<String, dynamic>>().toList() ?? const [],
    );
  }

  OrderItemEntity toEntity() {
    return OrderItemEntity(
      id: id ?? '',
      productId: id ?? '',
      productName: title ?? 'Product',
      quantity: quantity,
      price: price,
      size: (size != null && size!.trim().isNotEmpty) ? size!.trim() : null,
      category: (category != null && category!.trim().isNotEmpty) ? category!.trim() : null,
      addons: addons,
    );
  }
}

class OrderModel {
  final String id;
  final String restaurantId;
  final String? branchId;

  /// order_number is a serial (int) in the DB, but older mobile-created rows
  /// stored strings — normalized to String for display.
  final String orderNumber;
  final String status;
  final double totalPrice;
  final String createdAt;
  final String paymentMethod;
  final String? customerName;
  final String? customerPhone;
  final String? customerAddress;
  final String? notes;
  final List<OrderItemModel> items;

  /// dine_in | takeaway | pickup | delivery
  final String? orderType;
  final double subtotal;
  final double discount;
  final double deliveryFee;

  const OrderModel({
    required this.id,
    required this.restaurantId,
    this.branchId,
    required this.orderNumber,
    required this.status,
    required this.totalPrice,
    required this.createdAt,
    required this.paymentMethod,
    this.customerName,
    this.customerPhone,
    this.customerAddress,
    this.notes,
    this.items = const [],
    this.orderType,
    this.subtotal = 0,
    this.discount = 0,
    this.deliveryFee = 0,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] as String,
      restaurantId: json['restaurant_id'] as String? ?? '',
      branchId: json['branch_id'] as String?,
      orderNumber: json['order_number']?.toString() ?? '',
      status: json['status'] as String? ?? 'pending',
      totalPrice: (json['total'] as num? ?? 0).toDouble(),
      createdAt: json['created_at'] as String,
      paymentMethod: json['payment_method']?.toString() ?? 'cash',
      customerName: json['customer_name'] as String?,
      customerPhone: json['customer_phone'] as String?,
      customerAddress: json['customer_address'] as String?,
      notes: json['notes'] as String?,
      items: (json['items'] as List?)
              ?.whereType<Map<String, dynamic>>()
              .map(OrderItemModel.fromJson)
              .toList() ??
          const [],
      orderType: json['order_type']?.toString(),
      subtotal: (json['subtotal'] as num? ?? 0).toDouble(),
      discount: (json['discount'] as num? ?? 0).toDouble(),
      deliveryFee: (json['delivery_fee'] as num? ?? 0).toDouble(),
    );
  }

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
      items: items.map((i) => i.toEntity()).toList(),
      orderType: orderType,
      subtotal: subtotal,
      discount: discount,
      deliveryFee: deliveryFee,
    );
  }
}

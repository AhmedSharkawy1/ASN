/// Plain Dart entities (no codegen — build_runner is unavailable in this
/// environment) carrying the full order detail the UI and notifications show.
class OrderItemEntity {
  final String id;
  final String productId;
  final String productName;
  final int quantity;
  final double price;

  /// Size/variant label, e.g. "الكيلو".
  final String? size;

  /// Menu category the item belongs to.
  final String? category;
  final List<Map<String, dynamic>> addons;

  const OrderItemEntity({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.price,
    this.size,
    this.category,
    this.addons = const [],
  });

  double get lineTotal => price * quantity;
}

class OrderEntity {
  final String id;
  final String restaurantId;
  final String? branchId;
  final String orderNumber;
  final String status;
  final double totalPrice;
  final DateTime createdAt;
  final String paymentMethod;
  final String? customerName;
  final String? customerPhone;
  final String? customerAddress;
  final String? notes;
  final List<OrderItemEntity> items;

  /// dine_in | takeaway | pickup | delivery
  final String? orderType;
  final double subtotal;
  final double discount;
  final double deliveryFee;

  const OrderEntity({
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

  int get itemCount => items.fold(0, (sum, i) => sum + i.quantity);

  OrderEntity copyWith({String? status}) {
    return OrderEntity(
      id: id,
      restaurantId: restaurantId,
      branchId: branchId,
      orderNumber: orderNumber,
      status: status ?? this.status,
      totalPrice: totalPrice,
      createdAt: createdAt,
      paymentMethod: paymentMethod,
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
      notes: notes,
      items: items,
      orderType: orderType,
      subtotal: subtotal,
      discount: discount,
      deliveryFee: deliveryFee,
    );
  }
}

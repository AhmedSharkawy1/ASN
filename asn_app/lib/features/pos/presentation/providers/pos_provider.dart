import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

enum PosOrderType { dineIn, takeaway, delivery }

extension PosOrderTypeDb on PosOrderType {
  String get dbValue => switch (this) {
        PosOrderType.dineIn => 'dine_in',
        PosOrderType.takeaway => 'takeaway',
        PosOrderType.delivery => 'delivery',
      };
}

class CartItem {
  final ProductModel product;
  final ProductSize size;
  final int quantity;
  final String? categoryName;

  const CartItem({
    required this.product,
    required this.size,
    this.quantity = 1,
    this.categoryName,
  });

  /// Cart line identity: same product + same size merge together.
  String get key => '${product.id}::${size.label}';

  CartItem copyWith({int? quantity}) {
    return CartItem(
      product: product,
      size: size,
      quantity: quantity ?? this.quantity,
      categoryName: categoryName,
    );
  }

  double get totalPrice => size.price * quantity;
}

class CartState {
  final List<CartItem> items;
  final double discountValue;
  final bool discountIsPercent;
  final PosOrderType orderType;
  final double deliveryFee;
  final String? customerName;
  final String? customerPhone;
  final String? customerAddress;
  final String? notes;
  final String paymentMethod; // cash | deposit
  final double depositAmount;
  final bool isCheckingOut;

  const CartState({
    this.items = const [],
    this.discountValue = 0,
    this.discountIsPercent = false,
    this.orderType = PosOrderType.takeaway,
    this.deliveryFee = 0,
    this.customerName,
    this.customerPhone,
    this.customerAddress,
    this.notes,
    this.paymentMethod = 'cash',
    this.depositAmount = 0,
    this.isCheckingOut = false,
  });

  double get subtotal => items.fold(0, (sum, item) => sum + item.totalPrice);

  double get discount {
    final d = discountIsPercent ? subtotal * (discountValue / 100) : discountValue;
    return d.clamp(0, subtotal);
  }

  double get total {
    final t = subtotal - discount + (orderType == PosOrderType.delivery ? deliveryFee : 0);
    return t < 0 ? 0 : t;
  }

  int get itemCount => items.fold(0, (sum, item) => sum + item.quantity);

  CartState copyWith({
    List<CartItem>? items,
    double? discountValue,
    bool? discountIsPercent,
    PosOrderType? orderType,
    double? deliveryFee,
    String? customerName,
    String? customerPhone,
    String? customerAddress,
    String? notes,
    String? paymentMethod,
    double? depositAmount,
    bool? isCheckingOut,
  }) {
    return CartState(
      items: items ?? this.items,
      discountValue: discountValue ?? this.discountValue,
      discountIsPercent: discountIsPercent ?? this.discountIsPercent,
      orderType: orderType ?? this.orderType,
      deliveryFee: deliveryFee ?? this.deliveryFee,
      customerName: customerName ?? this.customerName,
      customerPhone: customerPhone ?? this.customerPhone,
      customerAddress: customerAddress ?? this.customerAddress,
      notes: notes ?? this.notes,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      depositAmount: depositAmount ?? this.depositAmount,
      isCheckingOut: isCheckingOut ?? this.isCheckingOut,
    );
  }
}

class CartNotifier extends Notifier<CartState> {
  @override
  CartState build() {
    // Switching restaurants must not carry a half-built order across.
    ref.watch(activeRestaurantIdProvider);
    return const CartState();
  }

  void addItem(ProductModel product, {ProductSize? size, String? categoryName}) {
    final resolvedSize = size ?? product.sizes.first;
    final newItem = CartItem(product: product, size: resolvedSize, categoryName: categoryName);
    final existingIndex = state.items.indexWhere((i) => i.key == newItem.key);

    if (existingIndex >= 0) {
      final updatedItems = List<CartItem>.from(state.items);
      final item = updatedItems[existingIndex];
      updatedItems[existingIndex] = item.copyWith(quantity: item.quantity + 1);
      state = state.copyWith(items: updatedItems);
    } else {
      state = state.copyWith(items: [...state.items, newItem]);
    }
  }

  void updateQuantity(String cartKey, int newQuantity) {
    if (newQuantity <= 0) {
      removeItem(cartKey);
      return;
    }

    final updatedItems = state.items.map((item) {
      if (item.key == cartKey) {
        return item.copyWith(quantity: newQuantity);
      }
      return item;
    }).toList();

    state = state.copyWith(items: updatedItems);
  }

  void removeItem(String cartKey) {
    state = state.copyWith(
      items: state.items.where((i) => i.key != cartKey).toList(),
    );
  }

  void setDiscount(double value, {required bool isPercent}) {
    state = state.copyWith(discountValue: value, discountIsPercent: isPercent);
  }

  void setOrderType(PosOrderType type) {
    state = state.copyWith(orderType: type);
  }

  void setDeliveryFee(double fee) {
    state = state.copyWith(deliveryFee: fee);
  }

  void setCustomer({String? name, String? phone, String? address, String? notes}) {
    state = state.copyWith(
      customerName: name,
      customerPhone: phone,
      customerAddress: address,
      notes: notes,
    );
  }

  void setPayment(String method, {double depositAmount = 0}) {
    state = state.copyWith(paymentMethod: method, depositAmount: depositAmount);
  }

  void clearCart() {
    state = const CartState();
  }

  Future<void> checkout() async {
    if (state.items.isEmpty) return;

    state = state.copyWith(isCheckingOut: true);

    try {
      final authState = ref.read(authNotifierProvider);
      final user = authState.maybeWhen(
        authenticated: (u) => u,
        orElse: () => throw Exception('User not authenticated'),
      );

      final orderId = const Uuid().v4();

      // Items in the web platform's jsonb shape.
      final orderItemsData = state.items.map((item) {
        return {
          'id': item.product.id,
          'title': item.product.titleAr,
          'qty': item.quantity,
          'price': item.size.price,
          if (item.size.label.isNotEmpty) 'size': item.size.label,
          if (item.categoryName != null) 'category': item.categoryName,
        };
      }).toList();

      final orderData = {
        'id': orderId,
        'restaurant_id': user.restaurantId,
        // order_number is a serial column — the DB assigns the next number.
        'status': 'pending',
        'order_type': state.orderType.dbValue,
        'items': orderItemsData,
        'subtotal': state.subtotal,
        'discount': state.discount,
        'discount_type': state.discountIsPercent ? 'percent' : 'fixed',
        'delivery_fee': state.orderType == PosOrderType.delivery ? state.deliveryFee : 0,
        'total': state.total,
        'payment_method': state.paymentMethod,
        'deposit_amount': state.paymentMethod == 'deposit' ? state.depositAmount : 0,
        'customer_name': state.customerName,
        'customer_phone': state.customerPhone,
        'customer_address':
            state.orderType == PosOrderType.delivery ? state.customerAddress : null,
        'notes': state.notes,
        'cashier_name': user.name,
        'created_by': user.id,
      };

      await SupabaseClientManager.client.from('orders').insert(orderData);

      AppLogger.info('Successfully checked out order $orderId', name: 'CartNotifier');
      clearCart();
    } catch (e, stackTrace) {
      AppLogger.error('Checkout failed', error: e, stackTrace: stackTrace, name: 'CartNotifier');
      state = state.copyWith(isCheckingOut: false);
      throw Exception('Checkout failed: $e');
    }
  }
}

final cartNotifierProvider = NotifierProvider<CartNotifier, CartState>(() {
  return CartNotifier();
});

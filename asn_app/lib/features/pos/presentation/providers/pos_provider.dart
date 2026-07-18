import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

class CartItem {
  final ProductModel product;
  final int quantity;
  final String? note;

  const CartItem({
    required this.product,
    this.quantity = 1,
    this.note,
  });

  CartItem copyWith({
    ProductModel? product,
    int? quantity,
    String? note,
  }) {
    return CartItem(
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
      note: note ?? this.note,
    );
  }

  double get totalPrice => product.price * quantity;
}

class CartState {
  final List<CartItem> items;
  final double taxRate;
  final bool isCheckingOut;

  const CartState({
    this.items = const [],
    this.taxRate = 0.15, // Default 15% tax
    this.isCheckingOut = false,
  });

  double get subtotal => items.fold(0, (sum, item) => sum + item.totalPrice);
  double get tax => subtotal * taxRate;
  double get total => subtotal + tax;

  CartState copyWith({
    List<CartItem>? items,
    double? taxRate,
    bool? isCheckingOut,
  }) {
    return CartState(
      items: items ?? this.items,
      taxRate: taxRate ?? this.taxRate,
      isCheckingOut: isCheckingOut ?? this.isCheckingOut,
    );
  }
}

class CartNotifier extends Notifier<CartState> {
  @override
  CartState build() {
    return const CartState();
  }

  void addItem(ProductModel product) {
    final existingIndex = state.items.indexWhere((i) => i.product.id == product.id);
    
    if (existingIndex >= 0) {
      final updatedItems = List<CartItem>.from(state.items);
      final item = updatedItems[existingIndex];
      updatedItems[existingIndex] = item.copyWith(quantity: item.quantity + 1);
      state = state.copyWith(items: updatedItems);
    } else {
      state = state.copyWith(items: [...state.items, CartItem(product: product)]);
    }
  }

  void updateQuantity(String productId, int newQuantity) {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }
    
    final updatedItems = state.items.map((item) {
      if (item.product.id == productId) {
        return item.copyWith(quantity: newQuantity);
      }
      return item;
    }).toList();
    
    state = state.copyWith(items: updatedItems);
  }

  void removeItem(String productId) {
    state = state.copyWith(
      items: state.items.where((i) => i.product.id != productId).toList(),
    );
  }

  void clearCart() {
    state = const CartState();
  }

  Future<void> checkout(String paymentMethod, {String? customerName, String? customerPhone}) async {
    if (state.items.isEmpty) return;
    
    state = state.copyWith(isCheckingOut: true);
    
    try {
      final authState = ref.read(authNotifierProvider);
      final user = authState.maybeWhen(
        authenticated: (u) => u,
        orElse: () => throw Exception('User not authenticated'),
      );

      final orderId = const Uuid().v4();
      final orderNumber = DateTime.now().millisecondsSinceEpoch.toString().substring(5);

      final orderData = {
        'id': orderId,
        'tenant_id': user.restaurantId,
        'restaurant_id': user.restaurantId,
        'branch_id': user.role.name == 'staff' ? user.restaurantId : null,
        'order_number': orderNumber,
        'status': 'pending',
        'total_price': state.total,
        'payment_method': paymentMethod,
        'customer_name': customerName,
        'customer_phone': customerPhone,
        'created_by': user.id,
      };

      // Insert Order
      await SupabaseClientManager.client.from('orders').insert(orderData);

      // Prepare Order Items
      final orderItemsData = state.items.map((item) {
        return {
          'id': const Uuid().v4(),
          'order_id': orderId,
          'product_id': item.product.id,
          'quantity': item.quantity,
          'price': item.product.price,
          'tenant_id': user.restaurantId,
        };
      }).toList();

      // Insert Order Items
      await SupabaseClientManager.client.from('order_items').insert(orderItemsData);

      AppLogger.info('Successfully checked out order $orderNumber', name: 'CartNotifier');
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

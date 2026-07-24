import 'package:flutter_test/flutter_test.dart';
import 'package:asn_app/features/pos/presentation/providers/pos_provider.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';

/// Money maths in the POS decides what a customer is actually charged, so the
/// totals are covered directly rather than only through the UI.
void main() {
  CartItem item({double price = 100, int qty = 1, String id = 'p1', String size = ''}) {
    return CartItem(
      product: ProductModel(id: id, titleAr: 'صنف', price: price),
      size: ProductSize(label: size, price: price),
      quantity: qty,
    );
  }

  group('cart totals', () {
    test('subtotal multiplies price by quantity across lines', () {
      const state = CartState(items: []);
      final withItems = state.copyWith(items: [
        item(price: 50, qty: 2), // 100
        item(price: 30, qty: 3, id: 'p2'), // 90
      ]);
      expect(withItems.subtotal, 190);
      expect(withItems.itemCount, 5);
    });

    test('fixed discount subtracts from subtotal', () {
      final s = const CartState().copyWith(
        items: [item(price: 100, qty: 2)],
        discountValue: 50,
      );
      expect(s.discount, 50);
      expect(s.total, 150);
    });

    test('percentage discount is computed on the subtotal', () {
      final s = const CartState().copyWith(
        items: [item(price: 200)],
        discountValue: 25,
        discountIsPercent: true,
      );
      expect(s.discount, 50);
      expect(s.total, 150);
    });

    test('discount can never exceed the subtotal or make the total negative', () {
      final s = const CartState().copyWith(
        items: [item(price: 40)],
        discountValue: 500,
      );
      expect(s.discount, 40);
      expect(s.total, 0);
    });

    test('delivery fee applies only to delivery orders', () {
      final base = const CartState().copyWith(
        items: [item(price: 100)],
        deliveryFee: 20,
      );
      expect(base.orderType, PosOrderType.takeaway);
      expect(base.total, 100, reason: 'takeaway must not be charged delivery');

      final delivery = base.copyWith(orderType: PosOrderType.delivery);
      expect(delivery.total, 120);
    });

    test('discount and delivery combine in the right order', () {
      final s = const CartState().copyWith(
        items: [item(price: 100, qty: 2)], // 200
        discountValue: 10,
        discountIsPercent: true, // -20
        deliveryFee: 15,
        orderType: PosOrderType.delivery,
      );
      expect(s.subtotal, 200);
      expect(s.discount, 20);
      expect(s.total, 195); // 200 - 20 + 15
    });
  });

  group('cart line identity', () {
    test('same product in different sizes stays on separate lines', () {
      final small = item(id: 'p1', size: 'صغير', price: 50);
      final large = item(id: 'p1', size: 'كبير', price: 80);
      expect(small.key, isNot(large.key));
    });

    test('same product and size share a line key so quantities merge', () {
      expect(item(id: 'p1', size: 'كبير').key, item(id: 'p1', size: 'كبير').key);
    });
  });

  group('order type mapping', () {
    test('maps to the values the database and web app store', () {
      expect(PosOrderType.dineIn.dbValue, 'dine_in');
      expect(PosOrderType.takeaway.dbValue, 'takeaway');
      expect(PosOrderType.delivery.dbValue, 'delivery');
    });
  });
}

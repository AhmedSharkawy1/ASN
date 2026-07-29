import 'package:flutter_test/flutter_test.dart';
import 'package:asn_app/features/pos/presentation/providers/pos_provider.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/promotions/data/models/promotion_model.dart';
import 'package:asn_app/features/promotions/domain/promotion_engine.dart';

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

  _orderRowTests();
}

/// The `orders` row a till checkout writes. The dashboard, the reports and the
/// web menu all read this table, so a missing or renamed column here is an
/// order that looks fine on screen and is counted wrong.
void _orderRowTests() {
  CartItem line({double price = 100, int qty = 1}) => CartItem(
        product: ProductModel(id: 'p1', titleAr: 'صنف', price: price),
        size: const ProductSize(label: '', price: 100),
        quantity: qty,
      );

  Map<String, dynamic> row(CartState state) => buildOrderRow(
        state,
        orderId: 'o1',
        restaurantId: 'r1',
        cashierName: 'كاشير',
        createdBy: 'u1',
      );

  group('order row', () {
    test('is tagged as a till order', () {
      // Without source=pos the web dashboard files it under "website", offers
      // the wrong status flow, and alerts staff for an order they just rang up.
      final r = row(CartState(items: [line()]));
      expect(r['source'], 'pos');
      expect(r['is_draft'], false);
      expect(r['status'], 'pending');
    });

    test('writes the discount to both column names', () {
      // Reports read `discount`; the website used to write only
      // `discount_amount`, which is why website offers showed as no discount.
      final r = row(CartState(items: [line(price: 200)], discountValue: 50));
      expect(r['discount'], 50);
      expect(r['discount_amount'], 50);
    });

    test('records which offer produced the discount', () {
      final promo = PromotionModel.fromJson({
        'id': 'promo-1',
        'name_ar': 'خصم الويك إند',
        'discount_type': PromotionModel.typeFixed,
        'discount_value': 30,
        'min_order_amount': 0,
        'required_items': [
          {'item_id': PromotionModel.allItemsId, 'item_title_ar': 'كل', 'qty': 1},
        ],
      });
      final r = row(CartState(
        items: [line(price: 200)],
        promotion: AppliedPromotion(
          promotion: promo,
          discountAmount: 30,
          freeShipping: false,
        ),
      ));
      expect(r['promotion_id'], 'promo-1');
      expect(r['promotion_name'], 'خصم الويك إند');
      expect(r['discount'], 30);
    });

    test('no offer leaves the attribution columns null', () {
      final r = row(CartState(items: [line()]));
      expect(r['promotion_id'], isNull);
      expect(r['promotion_name'], isNull);
    });

    test('the stored numbers add up', () {
      final state = CartState(
        items: [line(price: 200)],
        discountValue: 20,
        orderType: PosOrderType.delivery,
        deliveryFee: 15,
      );
      final r = row(state);
      expect(
        (r['subtotal'] as double) - (r['discount'] as double) + (r['delivery_fee'] as double),
        r['total'],
      );
    });

    test('an address is only stored for delivery', () {
      expect(
        row(CartState(items: [line()], customerAddress: 'شارع ١'))['customer_address'],
        isNull,
      );
      expect(
        row(CartState(
          items: [line()],
          orderType: PosOrderType.delivery,
          customerAddress: 'شارع ١',
        ))['customer_address'],
        'شارع ١',
      );
    });
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:asn_app/features/orders/data/models/order_model.dart';

/// These cases mirror bugs that actually reached production: an `int`
/// order_number crashing a String cast, and the two different item shapes the
/// web checkout and the mobile POS write into the same jsonb column.
void main() {
  Map<String, dynamic> baseOrder(Map<String, dynamic> overrides) => {
        'id': 'o1',
        'restaurant_id': 'r1',
        'order_number': 33,
        'status': 'pending',
        'total': 300,
        'created_at': '2026-03-10T11:50:48.111+00:00',
        'payment_method': 'cash',
        ...overrides,
      };

  group('order_number', () {
    test('accepts an int (serial column) without crashing', () {
      final order = OrderModel.fromJson(baseOrder({'order_number': 94}));
      expect(order.orderNumber, '94');
    });

    test('accepts a legacy String value', () {
      final order = OrderModel.fromJson(baseOrder({'order_number': '77'}));
      expect(order.orderNumber, '77');
    });

    test('survives a null order_number', () {
      final order = OrderModel.fromJson(baseOrder({'order_number': null}));
      expect(order.orderNumber, '');
    });
  });

  group('items jsonb — both shapes', () {
    test('parses the web checkout shape (title/qty/size/category)', () {
      final order = OrderModel.fromJson(baseOrder({
        'items': [
          {
            'id': 'i1',
            'title': '1 كيلو بيتيفور',
            'qty': 2,
            'price': 300,
            'size': 'الكيلو',
            'category': 'كحك العيد',
          }
        ],
      }));

      expect(order.items, hasLength(1));
      final entity = order.items.first.toEntity();
      expect(entity.productName, '1 كيلو بيتيفور');
      expect(entity.quantity, 2);
      expect(entity.price, 300);
      expect(entity.size, 'الكيلو');
      expect(entity.category, 'كحك العيد');
      expect(entity.lineTotal, 600);
    });

    test('parses the mobile POS shape (product_name/quantity)', () {
      final order = OrderModel.fromJson(baseOrder({
        'items': [
          {'id': 'i2', 'product_name': 'برجر', 'quantity': 3, 'price': 50}
        ],
      }));

      final entity = order.items.first.toEntity();
      expect(entity.productName, 'برجر');
      expect(entity.quantity, 3);
      expect(entity.lineTotal, 150);
    });

    test('missing items yields an empty list rather than throwing', () {
      final order = OrderModel.fromJson(baseOrder({'items': null}));
      expect(order.items, isEmpty);
      expect(order.toEntity().items, isEmpty);
    });

    test('ignores malformed entries inside items', () {
      final order = OrderModel.fromJson(baseOrder({
        'items': ['not-an-object', 42, null],
      }));
      expect(order.items, isEmpty);
    });
  });

  group('money and type fields', () {
    test('reads the full money breakdown', () {
      final order = OrderModel.fromJson(baseOrder({
        'subtotal': 280,
        'discount': 30,
        'delivery_fee': 50,
        'total': 300,
        'order_type': 'delivery',
      })).toEntity();

      expect(order.subtotal, 280);
      expect(order.discount, 30);
      expect(order.deliveryFee, 50);
      expect(order.totalPrice, 300);
      expect(order.orderType, 'delivery');
    });

    test('defaults money fields to zero when absent', () {
      final order = OrderModel.fromJson(baseOrder({})).toEntity();
      expect(order.subtotal, 0);
      expect(order.discount, 0);
      expect(order.deliveryFee, 0);
    });

    test('falls back to cash when payment_method is null', () {
      final order = OrderModel.fromJson(baseOrder({'payment_method': null}));
      expect(order.paymentMethod, 'cash');
    });
  });

  group('entity helpers', () {
    test('itemCount sums quantities, not line count', () {
      final order = OrderModel.fromJson(baseOrder({
        'items': [
          {'title': 'a', 'qty': 2, 'price': 10},
          {'title': 'b', 'qty': 3, 'price': 10},
        ],
      })).toEntity();
      expect(order.items.length, 2);
      expect(order.itemCount, 5);
    });

    test('copyWith changes only the status', () {
      final order = OrderModel.fromJson(baseOrder({})).toEntity();
      final updated = order.copyWith(status: 'ready');
      expect(updated.status, 'ready');
      expect(updated.id, order.id);
      expect(updated.totalPrice, order.totalPrice);
    });
  });
}

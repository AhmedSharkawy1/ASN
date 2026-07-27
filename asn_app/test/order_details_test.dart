import 'package:flutter_test/flutter_test.dart';
import 'package:asn_app/features/orders/data/models/order_model.dart';

/// Guards the per-item note and delivery-zone plumbing: both come from the web
/// checkout's jsonb shape, which uses different key names than the mobile POS.
void main() {
  group('per-item note', () {
    test('reads the web "notes" key', () {
      final item = OrderItemModel.fromJson({
        'title': 'بيتزا',
        'qty': 2,
        'price': 100,
        'notes': 'بدون زيتون',
      }).toEntity();
      expect(item.note, 'بدون زيتون');
    });

    test('reads the POS "note" key', () {
      final item = OrderItemModel.fromJson({
        'product_name': 'برجر',
        'quantity': 1,
        'price': 80,
        'note': 'ويل دون',
      }).toEntity();
      expect(item.note, 'ويل دون');
    });

    test('treats null and the literal string "null" as no note', () {
      expect(OrderItemModel.fromJson({'title': 'x', 'notes': null}).toEntity().note, isNull);
      expect(OrderItemModel.fromJson({'title': 'x', 'notes': 'null'}).toEntity().note, isNull);
      expect(OrderItemModel.fromJson({'title': 'x', 'notes': '   '}).toEntity().note, isNull);
    });

    test('web "extras" surface as addons', () {
      final item = OrderItemModel.fromJson({
        'title': 'شاورما',
        'extras': [
          {'name': 'جبنة'},
        ],
      }).toEntity();
      expect(item.addons.length, 1);
    });
  });

  group('delivery zone', () {
    test('is carried through to the entity', () {
      final order = OrderModel.fromJson({
        'id': 'o1',
        'created_at': '2026-07-25T10:00:00Z',
        'order_type': 'delivery',
        'delivery_zone_name': 'ابنى بيتك السابعه',
        'customer_address': 'جمب مدرسه الايمان',
        'items': const <Map<String, dynamic>>[],
      }).toEntity();
      expect(order.deliveryZoneName, 'ابنى بيتك السابعه');
      expect(order.customerAddress, 'جمب مدرسه الايمان');
    });

    test('blank zone becomes null so the UI can skip the row', () {
      final order = OrderModel.fromJson({
        'id': 'o2',
        'created_at': '2026-07-25T10:00:00Z',
        'delivery_zone_name': '   ',
        'items': const <Map<String, dynamic>>[],
      }).toEntity();
      expect(order.deliveryZoneName, isNull);
    });
  });
}

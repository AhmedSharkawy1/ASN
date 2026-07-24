import 'package:flutter_test/flutter_test.dart';
import 'package:asn_app/core/services/order_alert_builder.dart';

/// The alert builder decides what staff see when an order lands, including
/// whether the "call the customer" action appears at all.
void main() {
  Map<String, dynamic> order(Map<String, dynamic> overrides) => {
        'id': 'o1',
        'order_number': 94,
        'total': 250,
        ...overrides,
      };

  test('drafts (held POS orders) never raise an alert', () {
    expect(OrderAlert.fromOrder(order({'is_draft': true})), isNull);
  });

  test('a row without an id is ignored rather than crashing', () {
    expect(OrderAlert.fromOrder({'order_number': 1, 'id': ''}), isNull);
  });

  test('title carries the order number and type', () {
    final alert = OrderAlert.fromOrder(order({'order_type': 'delivery'}))!;
    expect(alert.title, contains('94'));
    expect(alert.title, contains('دليفري'));
  });

  test('body includes customer, items and total', () {
    final alert = OrderAlert.fromOrder(order({
      'customer_name': 'أحمد',
      'customer_phone': '01000000000',
      'items': [
        {'title': 'برجر', 'qty': 2, 'category': 'وجبات'},
      ],
    }))!;

    expect(alert.body, contains('أحمد'));
    expect(alert.body, contains('01000000000'));
    expect(alert.body, contains('برجر'));
    expect(alert.body, contains('وجبات'), reason: 'category should be shown');
    expect(alert.body, contains('250'));
  });

  test('payload carries the phone so the call action can dial', () {
    final alert = OrderAlert.fromOrder(order({'customer_phone': '0111'}))!;
    expect(alert.payload, contains('0111'));
    expect(alert.payload, contains('/orders'));
  });

  test('notification id is stable for the same order', () {
    final a = OrderAlert.fromOrder(order({}))!;
    final b = OrderAlert.fromOrder(order({}))!;
    expect(a.id, b.id, reason: 'a repeat poll must replace, not duplicate');
  });

  test('different orders get different notification ids', () {
    final a = OrderAlert.fromOrder(order({'id': 'o1'}))!;
    final b = OrderAlert.fromOrder(order({'id': 'o2'}))!;
    expect(a.id, isNot(b.id));
  });

  group('label mapping', () {
    test('order types map to Arabic labels', () {
      expect(OrderAlert.orderTypeLabel('delivery'), 'دليفري');
      expect(OrderAlert.orderTypeLabel('dine_in'), 'صالة');
      expect(OrderAlert.orderTypeLabel('takeaway'), 'تيك أواي');
      expect(OrderAlert.orderTypeLabel('pickup'), 'تيك أواي');
    });

    test('unknown order type falls back to a generic label', () {
      expect(OrderAlert.orderTypeLabel(null), 'طلب');
      expect(OrderAlert.orderTypeLabel('something_new'), 'طلب');
    });

    test('payment methods map to Arabic labels', () {
      expect(OrderAlert.paymentLabel('cash'), 'كاش');
      expect(OrderAlert.paymentLabel('deposit'), 'عربون');
      expect(OrderAlert.paymentLabel(null), 'كاش');
    });
  });
}

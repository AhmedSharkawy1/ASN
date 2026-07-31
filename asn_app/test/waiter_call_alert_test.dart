import 'dart:convert';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:asn_app/core/services/order_alert_builder.dart';
import 'package:asn_app/core/services/waiter_call_alert.dart';

/// What staff see when someone at a table asks for a waiter.
void main() {
  Map<String, dynamic> call(Map<String, dynamic> overrides) => {
        'id': 'c1',
        'table_number': '7',
        'status': 'pending',
        ...overrides,
      };

  group('what raises an alert', () {
    test('a pending call names its table', () {
      final alert = WaiterCallAlert.fromRow(call({}))!;
      expect(alert.title, contains('7'));
      expect(alert.body, contains('7'));
    });

    test('a call someone already answered stays silent', () {
      // Otherwise resolving a call would send a second waiter for nothing.
      expect(WaiterCallAlert.fromRow(call({'status': 'resolved'})), isNull);
    });

    test('a row with no table is ignored rather than alerting nowhere', () {
      expect(WaiterCallAlert.fromRow(call({'table_number': ''})), isNull);
      expect(WaiterCallAlert.fromRow(call({'table_number': '   '})), isNull);
    });

    test('a row with no id is ignored', () {
      expect(WaiterCallAlert.fromRow(call({'id': ''})), isNull);
    });

    test('a note replaces the default wording', () {
      final alert = WaiterCallAlert.fromRow(call({'note': 'محتاج فاتورة'}))!;
      expect(alert.body, 'محتاج فاتورة');
    });
  });

  group('telling it apart from an order', () {
    test('it has its own channel and its own vibration', () {
      expect(WaiterCallAlert.channelId, isNot(OrderAlert.channelId));
      expect(WaiterCallAlert.vibrationPattern, isNot(OrderAlert.vibrationPattern));
      expect(WaiterCallAlert.channel().importance, Importance.max);
    });

    test('its ids cannot collide with an order alert', () {
      // Sharing an id would make one silently replace the other's card.
      final waiter = WaiterCallAlert.fromRow(call({'id': 'shared-id'}))!;
      final order = OrderAlert.fromOrder({
        'id': 'shared-id',
        'order_number': 1,
        'total': 10,
      })!;
      expect(waiter.id, isNot(order.id));
      expect(waiter.id, greaterThanOrEqualTo(0));
    });

    test('the same call always maps to one id, so it rings once', () {
      final first = WaiterCallAlert.fromRow(call({}))!;
      final second = WaiterCallAlert.fromRow(call({'note': 'مختلف'}))!;
      expect(first.id, second.id);
    });

    test('each call is its own card rather than a stack', () {
      final a = WaiterCallAlert.fromRow(call({'id': 'a'}))!;
      final b = WaiterCallAlert.fromRow(call({'id': 'b'}))!;
      expect(a.details.android!.groupKey, isNot(b.details.android!.groupKey));
    });
  });

  test('tapping opens the app rather than going nowhere', () {
    final alert = WaiterCallAlert.fromRow(call({}))!;
    final payload = jsonDecode(alert.payload) as Map<String, dynamic>;
    expect(payload['route'], OrderAlert.routeBase());
    expect(payload['table'], '7');
    expect(payload['waiterCallId'], 'c1');
  });
}

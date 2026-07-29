import 'dart:convert';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
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

  group('tapping the alert', () {
    test('the route carries the order id so its details open directly', () {
      final alert = OrderAlert.fromOrder(order({'id': 'abc-123'}))!;
      final payload = jsonDecode(alert.payload) as Map<String, dynamic>;

      expect(payload['orderId'], 'abc-123');
      expect(
        payload['route'],
        '${OrderAlert.routeBase()}?${OrderAlert.orderIdQueryParam}=abc-123',
      );
    });

    test('an id needing encoding stays readable as a query parameter', () {
      final alert = OrderAlert.fromOrder(order({'id': 'a b&c'}))!;
      final payload = jsonDecode(alert.payload) as Map<String, dynamic>;
      final uri = Uri.parse(payload['route'] as String);

      // Round-trips: the screen must recover the id exactly as stored.
      expect(uri.queryParameters[OrderAlert.orderIdQueryParam], 'a b&c');
    });

    test('the phone travels separately for the call action', () {
      final alert = OrderAlert.fromOrder(order({'customer_phone': '01000000000'}))!;
      final payload = jsonDecode(alert.payload) as Map<String, dynamic>;
      expect(payload['phone'], '01000000000');
    });
  });

  group('one card per order', () {
    test('ids are positive — some launchers mishandle negative ones', () {
      for (final id in ['o1', 'o2', 'zzz', 'a-very-long-uuid-like-value-0000']) {
        expect(OrderAlert.fromOrder(order({'id': id}))!.id, greaterThanOrEqualTo(0));
      }
    });

    test('the same order always maps to the same id, so it cannot alert twice', () {
      final first = OrderAlert.fromOrder(order({'id': 'same'}))!;
      final second = OrderAlert.fromOrder(order({'id': 'same', 'total': 999}))!;
      expect(first.id, second.id);
    });
  });

  group('the order chime', () {
    test('lives on its own channel — Android freezes a channel\'s sound', () {
      // Reusing the old id would leave existing installs on the default tone,
      // because createNotificationChannel cannot change one already created.
      expect(OrderAlert.channelId, isNot(OrderAlert.legacyChannelId));
    });

    test('the channel carries the bundled sound and a vibration pattern', () {
      final channel = OrderAlert.channel();
      expect(channel.playSound, isTrue);
      expect(channel.sound, OrderAlert.sound);
      expect(channel.enableVibration, isTrue);
      expect(channel.vibrationPattern, isNotNull);
      expect(channel.importance, Importance.max);
    });

    test('the sound names the raw resource the build keeps', () {
      // keep.xml protects @raw/order_alert from the resource shrinker; a
      // rename here without updating that file ships a silent release.
      expect(
        (OrderAlert.sound as RawResourceAndroidNotificationSound).sound,
        'order_alert',
      );
    });

    test('every alert uses that channel, not an ad-hoc one', () {
      final alert = OrderAlert.fromOrder(order({}))!;
      expect(alert.details.android!.channelId, OrderAlert.channelId);
      expect(alert.details.android!.sound, OrderAlert.sound);
    });
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

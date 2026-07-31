import 'dart:convert';
import 'dart:typed_data';
import 'dart:ui';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// The alert raised when a customer presses "call the waiter" on the menu.
///
/// Kept separate from the order alert on purpose: staff must be able to tell
/// the two apart without looking, so it uses its own channel, its own tone
/// pattern and its own wording. It also carries no money and no items — a
/// table number is the whole message.
class WaiterCallAlert {
  static const String channelId = 'waiter_calls_channel';
  static const String channelName = 'نداء الجرسون';
  static const String channelDescription = 'تنبيه عندما ينادي عميل على الجرسون';

  /// Offset so a waiter call and an order can never collide on one id and
  /// silently replace each other.
  static const int _idOffset = 1 << 28;

  /// Two short bursts — distinct from the order alert's long-short-long.
  static final Int64List vibrationPattern =
      Int64List.fromList([0, 250, 150, 250]);

  final int id;
  final String title;
  final String body;
  final NotificationDetails details;
  final String payload;

  const WaiterCallAlert({
    required this.id,
    required this.title,
    required this.body,
    required this.details,
    required this.payload,
  });

  static AndroidNotificationChannel channel() => AndroidNotificationChannel(
        channelId,
        channelName,
        description: channelDescription,
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
        vibrationPattern: vibrationPattern,
      );

  /// Returns null for rows that should not alert (already handled, or no table).
  static WaiterCallAlert? fromRow(Map<String, dynamic> row) {
    final id = row['id']?.toString() ?? '';
    if (id.isEmpty) return null;

    // Someone already went to the table; alerting now would send a second
    // person for nothing.
    final status = row['status']?.toString();
    if (status != null && status.isNotEmpty && status != 'pending') return null;

    final table = row['table_number']?.toString().trim() ?? '';
    if (table.isEmpty) return null;

    final note = row['note']?.toString().trim();

    final title = '🔔 ترابيزة $table تنادي';
    final body = note != null && note.isNotEmpty
        ? note
        : 'عميل على ترابيزة $table يطلب الجرسون';

    final android = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: channelDescription,
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      vibrationPattern: vibrationPattern,
      color: const Color(0xFF2F6690),
      colorized: true,
      ticker: 'ترابيزة $table تنادي',
      category: AndroidNotificationCategory.call,
      visibility: NotificationVisibility.public,
      // Its own group, so several tables calling stay as separate cards
      // instead of collapsing into one stack.
      groupKey: 'asn_waiter_$id',
      setAsGroupSummary: false,
      onlyAlertOnce: false,
      autoCancel: true,
      styleInformation: BigTextStyleInformation(body, contentTitle: title),
    );

    const ios = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    return WaiterCallAlert(
      // Positive and offset away from the order id space.
      id: (id.hashCode & 0x0FFFFFFF) | _idOffset,
      title: title,
      body: body,
      details: NotificationDetails(android: android, iOS: ios),
      // Nothing to open per call, so a tap lands on the orders screen the way
      // the rest of the app does.
      payload: jsonEncode({'route': '/orders', 'waiterCallId': id, 'table': table}),
    );
  }

  Future<void> show(FlutterLocalNotificationsPlugin plugin) {
    return plugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: details,
      payload: payload,
    );
  }
}

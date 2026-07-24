import 'dart:convert';
import 'dart:ui';

import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Shared builder so the live listener and the background service raise the
/// exact same rich order alert: number, items, customer name + phone, total,
/// and a "call the customer" action button.
class OrderAlert {
  static const String channelId = 'orders_channel';
  static const String channelName = 'New Orders';
  static const String callActionId = 'call_customer';
  static const String openActionId = 'open_order';

  final int id;
  final String title;
  final String body;
  final NotificationDetails details;
  final String payload;

  const OrderAlert({
    required this.id,
    required this.title,
    required this.body,
    required this.details,
    required this.payload,
  });

  /// Returns null for drafts / rows that shouldn't alert.
  static OrderAlert? fromOrder(Map<String, dynamic> order) {
    if (order['is_draft'] == true) return null;

    final orderId = order['id']?.toString() ?? '';
    if (orderId.isEmpty) return null;

    final orderNumber = order['order_number']?.toString() ?? '';
    final name = (order['customer_name'] as String?)?.trim();
    final phone = (order['customer_phone'] as String?)?.trim();
    final address = (order['customer_address'] as String?)?.trim();
    final notes = (order['notes'] as String?)?.trim();
    final total = (order['total'] as num?)?.toDouble() ?? 0;
    final deliveryFee = (order['delivery_fee'] as num?)?.toDouble() ?? 0;
    final discount = (order['discount'] as num?)?.toDouble() ?? 0;
    final typeLabel = orderTypeLabel(order['order_type']?.toString());
    final payLabel = paymentLabel(order['payment_method']?.toString());

    final title = '🛍️ طلب جديد #$orderNumber • $typeLabel';

    // Expanded view: one line per item (with its category), then the money.
    final lines = <String>[
      if (name != null && name.isNotEmpty)
        '👤 $name${phone != null && phone.isNotEmpty ? '  •  📞 $phone' : ''}',
      ..._itemLines(order['items']),
      if (address != null && address.isNotEmpty) '📍 $address',
      if (notes != null && notes.isNotEmpty) '📝 $notes',
      if (discount > 0) '🏷️ خصم: ${_fmt(discount)}',
      if (deliveryFee > 0) '🚚 توصيل: ${_fmt(deliveryFee)}',
      '💰 الإجمالي: ${_fmt(total)} جنيه  •  $payLabel',
    ];

    final android = AndroidNotificationDetails(
      channelId,
      channelName,
      channelDescription: 'Notifications for new incoming orders',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
      color: const Color(0xFF0D9488),
      colorized: true,
      ticker: 'طلب جديد #$orderNumber',
      category: AndroidNotificationCategory.call,
      visibility: NotificationVisibility.public,
      styleInformation: InboxStyleInformation(
        lines,
        contentTitle: title,
        summaryText: '${_itemCount(order['items'])} صنف • ${_fmt(total)} جنيه',
        htmlFormatContentTitle: false,
        htmlFormatSummaryText: false,
      ),
      actions: [
        if (phone != null && phone.isNotEmpty)
          const AndroidNotificationAction(
            callActionId,
            '📞 اتصال بالعميل',
            showsUserInterface: true,
          ),
        const AndroidNotificationAction(
          openActionId,
          '📋 عرض الطلب',
          showsUserInterface: true,
        ),
      ],
    );

    const ios = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    return OrderAlert(
      id: orderId.hashCode,
      title: title,
      body: lines.join(' • '),
      details: NotificationDetails(android: android, iOS: ios),
      payload: jsonEncode({'route': '/orders', 'phone': phone, 'orderId': orderId}),
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

  /// One line per item: "🍽️ 2× برجر (الحجم) — القسم".
  /// Handles both the web checkout and mobile POS jsonb shapes.
  static List<String> _itemLines(Object? items) {
    if (items is! List || items.isEmpty) return const [];
    final lines = <String>[];
    for (final raw in items.take(5)) {
      if (raw is! Map) continue;
      final name = (raw['title'] ?? raw['product_name'] ?? '').toString();
      if (name.isEmpty) continue;
      final qty = ((raw['qty'] ?? raw['quantity']) as num? ?? 1).toInt();
      final size = raw['size']?.toString();
      final category = raw['category']?.toString();
      final buffer = StringBuffer('🍽️ $qty× $name');
      if (size != null && size.trim().isNotEmpty) buffer.write(' (${size.trim()})');
      if (category != null && category.trim().isNotEmpty) buffer.write(' — ${category.trim()}');
      lines.add(buffer.toString());
    }
    if (items.length > 5) lines.add('… و${items.length - 5} أصناف أخرى');
    return lines;
  }

  static int _itemCount(Object? items) {
    if (items is! List) return 0;
    return items.whereType<Map<String, dynamic>>().fold<int>(
        0, (sum, i) => sum + (((i['qty'] ?? i['quantity']) as num? ?? 1).toInt()));
  }

  static String orderTypeLabel(String? type) {
    switch (type) {
      case 'delivery':
        return 'دليفري';
      case 'dine_in':
        return 'صالة';
      case 'takeaway':
      case 'pickup':
        return 'تيك أواي';
      default:
        return 'طلب';
    }
  }

  static String paymentLabel(String? method) {
    switch (method) {
      case 'cash':
        return 'كاش';
      case 'card':
        return 'بطاقة';
      case 'deposit':
        return 'عربون';
      default:
        return method ?? 'كاش';
    }
  }

  static String _fmt(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);
}

import 'dart:typed_data';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/features/orders/domain/entities/order_entity.dart';

class NotificationsService {
  final FlutterLocalNotificationsPlugin _plugin;

  NotificationsService([FlutterLocalNotificationsPlugin? plugin])
      : _plugin = plugin ?? FlutterLocalNotificationsPlugin();

  static const String _channelId = 'asn_new_orders_channel';
  static const String _channelName = 'New Orders Channel';
  static const String _channelDesc = 'Notifications for newly placed orders';

  Future<void> initialize() async {
    try {
      AppLogger.info('Initializing local notifications service...', name: 'Notifications');

      const androidSettings = AndroidInitializationSettings('ic_notification');
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      const initSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      await _plugin.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          AppLogger.info('Notification response received: ${response.payload}', name: 'Notifications');
          // Handle navigation click here if needed
        },
      );

      // Create Android Channel
      const androidChannel = AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: _channelDesc,
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      );

      final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin>();
      if (androidPlugin != null) {
        await androidPlugin.createNotificationChannel(androidChannel);
        AppLogger.info('Android notification channel created successfully', name: 'Notifications');
      }
    } catch (e, stackTrace) {
      AppLogger.error('Failed to initialize local notifications', error: e, stackTrace: stackTrace, name: 'Notifications');
    }
  }

  Future<void> showNewOrderNotification(OrderEntity order) async {
    try {
      AppLogger.info('Triggering local notification for Order #${order.orderNumber}', name: 'Notifications');

      final androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDesc,
        importance: Importance.max,
        priority: Priority.high,
        playSound: true,
        enableVibration: true,
        vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 800]), // Custom vibration pattern
        styleInformation: BigTextStyleInformation(
          'Total: \$${order.totalPrice.toStringAsFixed(2)}\nPayment: ${order.paymentMethod}',
          contentTitle: '🛍️ Order #${order.orderNumber} Placed!',
        ),
      );

      const iosDetails = DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: true,
        presentSound: true,
      );

      final details = NotificationDetails(
        android: androidDetails,
        iOS: iosDetails,
      );

      // Unique notification id using order number hash or last 4 digits
      final notificationId = order.orderNumber.hashCode;

      await _plugin.show(
        id: notificationId,
        title: '🛍️ Order #${order.orderNumber} Placed!',
        body: 'Total: \$${order.totalPrice.toStringAsFixed(2)} | ${order.paymentMethod}',
        notificationDetails: details,
        payload: order.id,
      );
    } catch (e, stackTrace) {
      AppLogger.error('Failed to trigger order local notification', error: e, stackTrace: stackTrace, name: 'Notifications');
    }
  }
}

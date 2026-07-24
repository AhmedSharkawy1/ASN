import 'dart:convert';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/services/order_alert_builder.dart';
import 'package:asn_app/shared/data/supabase_client.dart';

/// App-wide new-order alerts: subscribes to Supabase realtime INSERTs on
/// `orders` for the logged-in restaurant and raises a local notification
/// with the order number, customer name, and a direct call action.
class OrderNotificationService {
  final SupabaseClient _supabase;
  final FlutterLocalNotificationsPlugin _localNotifications;
  RealtimeChannel? _ordersChannel;
  String? _currentRestaurantId;

  /// Set by the app shell so notification taps can navigate (e.g. to /orders).
  static void Function(String route)? navigateTo;

  static const String _callActionId = 'call_customer';

  OrderNotificationService(this._supabase, this._localNotifications);

  Future<void> initialize() async {
    const androidSettings = AndroidInitializationSettings('ic_notification');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const initSettings = InitializationSettings(android: androidSettings, iOS: iosSettings);

    await _localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: _onNotificationResponse,
    );

    // Explicit max-importance channel so alerts heads-up + sound.
    const channel = AndroidNotificationChannel(
      'orders_channel',
      'New Orders',
      description: 'Notifications for new incoming orders',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    );
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  /// Android 13+ drops notifications silently unless the runtime
  /// permission has been granted — ask for it explicitly.
  Future<void> requestPermissions() async {
    try {
      final androidPlugin = _localNotifications
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      await androidPlugin?.requestNotificationsPermission();

      final iosPlugin = _localNotifications
          .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>();
      await iosPlugin?.requestPermissions(alert: true, badge: true, sound: true);
    } catch (e) {
      AppLogger.warning('Notification permission request failed: $e', name: 'OrderNotification');
    }
  }

  void _onNotificationResponse(NotificationResponse details) {
    Map<String, dynamic> payload = {};
    try {
      if (details.payload?.isNotEmpty == true) {
        payload = jsonDecode(details.payload!) as Map<String, dynamic>;
      }
    } catch (e) {
      AppLogger.warning('Unreadable notification payload: $e', name: 'OrderNotification');
    }

    if (details.actionId == _callActionId) {
      final phone = payload['phone'] as String?;
      if (phone != null && phone.isNotEmpty) {
        launchUrl(Uri(scheme: 'tel', path: phone));
      }
      return;
    }

    // Default tap: open the orders screen
    navigateTo?.call(payload['route'] as String? ?? '/orders');
  }

  void startListening(String restaurantId) {
    if (_currentRestaurantId == restaurantId && _ordersChannel != null) {
      return; // Already listening
    }

    stopListening();
    _currentRestaurantId = restaurantId;

    _ordersChannel = _supabase
        .channel('public:orders:restaurant_$restaurantId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'orders',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'restaurant_id',
            value: restaurantId,
          ),
          callback: _onOrderInserted,
        )
        .subscribe();

    AppLogger.info('Started listening to orders for restaurant: $restaurantId', name: 'OrderNotification');
  }

  void stopListening() {
    if (_ordersChannel != null) {
      _supabase.removeChannel(_ordersChannel!);
      _ordersChannel = null;
    }
    _currentRestaurantId = null;
    AppLogger.info('Stopped listening to orders', name: 'OrderNotification');
  }

  Future<void> _onOrderInserted(PostgresChangePayload payload) async {
    final alert = OrderAlert.fromOrder(payload.newRecord);
    if (alert == null) return;
    AppLogger.info('New order alert: ${alert.title}', name: 'OrderNotification');
    await alert.show(_localNotifications);
  }

  /// If the app was cold-launched by tapping a notification (or its call
  /// action), replay that tap once the app is up.
  Future<void> handleLaunchAction() async {
    try {
      final details = await _localNotifications.getNotificationAppLaunchDetails();
      final response = details?.notificationResponse;
      if (details?.didNotificationLaunchApp == true && response != null) {
        _onNotificationResponse(response);
      }
    } catch (e) {
      AppLogger.warning('Launch action handling failed: $e', name: 'OrderNotification');
    }
  }
}

final orderNotificationServiceProvider = Provider<OrderNotificationService>((ref) {
  final supabase = SupabaseClientManager.client;
  final localNotifications = FlutterLocalNotificationsPlugin();

  final service = OrderNotificationService(supabase, localNotifications);

  // Initialize immediately
  service.initialize();

  ref.onDispose(() {
    service.stopListening();
  });

  return service;
});

import 'dart:async';
import 'dart:convert';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/services/background_order_service.dart';
import 'package:asn_app/core/services/order_alert_builder.dart';
import 'package:asn_app/core/services/waiter_call_alert.dart';
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

  // The action ids live on OrderAlert, which is what puts the buttons on the
  // notification. A second copy here would only ever drift out of step and
  // stop the branch matching.

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

    final android = _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

    // Max importance so alerts heads-up, with the order chime and vibration.
    await android?.createNotificationChannel(OrderAlert.channel());
    await android?.createNotificationChannel(WaiterCallAlert.channel());

    // The pre-chime channel would otherwise linger in the system settings as a
    // second, silent "New Orders" entry the user could switch on by mistake.
    try {
      await android?.deleteNotificationChannel(channelId: OrderAlert.legacyChannelId);
      await android?.deleteNotificationChannel(channelId: WaiterCallAlert.legacyChannelId);
    } catch (e) {
      AppLogger.warning('Could not remove the old orders channel: $e',
          name: 'OrderNotification');
    }
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

    if (details.actionId == OrderAlert.callActionId) {
      unawaited(_dial(payload['phone'] as String?));
      return;
    }

    // Everything else — the plain tap and the "view order" action — lands on
    // the order's own details.
    navigateTo?.call(payload['route'] as String? ?? OrderAlert.routeBase());
  }

  /// Opens the dialer with the customer's number filled in.
  ///
  /// Stops short of placing the call: the staff member confirms it, and a
  /// notification tapped by accident must not ring a customer.
  Future<void> _dial(String? rawPhone) async {
    // Numbers arrive with spaces, dashes or an Arabic-Indic keypad's digits.
    // A tel: URI accepts none of that.
    final digits = _toWesternDigits(rawPhone ?? '')
        .replaceAll(RegExp(r'[^0-9+]'), '');
    if (digits.isEmpty) {
      AppLogger.warning('Call action with no usable number', name: 'OrderNotification');
      return;
    }

    final uri = Uri(scheme: 'tel', path: digits);
    try {
      final opened = await launchUrl(uri);
      if (!opened) {
        AppLogger.warning('Dialer refused $uri', name: 'OrderNotification');
      }
    } catch (e) {
      // Android 11+ hides apps that are not declared in <queries>; a missing
      // declaration surfaces here rather than as a silent no-op.
      AppLogger.warning('Could not open the dialer: $e', name: 'OrderNotification');
    }
  }

  static String _toWesternDigits(String input) {
    const arabicIndic = '٠١٢٣٤٥٦٧٨٩';
    final buffer = StringBuffer();
    for (final rune in input.runes) {
      final char = String.fromCharCode(rune);
      final index = arabicIndic.indexOf(char);
      buffer.write(index >= 0 ? '$index' : char);
    }
    return buffer.toString();
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
    await consumePendingTap();
  }

  /// Carries out a tap the background isolate parked for us.
  ///
  /// An alert raised while the app was closed is posted by that isolate, and
  /// the tap is delivered there — where there is no navigator. It records what
  /// was tapped; this runs on launch and on every resume, which is precisely
  /// when the tap has brought the app to the front.
  Future<void> consumePendingTap() async {
    final raw = await BackgroundOrderService.takePendingTap();
    if (raw == null) return;

    try {
      final parked = jsonDecode(raw) as Map<String, dynamic>;
      final payload = parked['payload'] as String?;
      if (payload == null || payload.isEmpty) return;
      _onNotificationResponse(NotificationResponse(
        notificationResponseType: NotificationResponseType.selectedNotification,
        payload: payload,
        actionId: parked['actionId'] as String?,
      ));
    } catch (e) {
      AppLogger.warning('Unreadable parked tap: $e', name: 'OrderNotification');
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

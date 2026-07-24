import 'dart:convert';
import 'dart:ui';

import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/services/order_alert_builder.dart';
import 'package:asn_app/core/services/order_poll_client.dart';

/// Keeps order alerts arriving when the app is closed — without Firebase.
///
/// Android will not wake a fully-closed app for a message unless it comes
/// through a push service (FCM) or the app runs a foreground service. Since
/// this platform is Supabase-only, we run a foreground service whose isolate
/// polls the `orders` table every 20s over plain authenticated REST and
/// raises a local notification for anything new.
///
/// Auth deliberately uses raw REST (not the Supabase SDK) inside the isolate:
/// two isolates sharing the SDK fight over refresh-token rotation, which can
/// silently leave the background one unauthenticated. Here the isolate owns a
/// simple read-token / refresh-on-401 loop against a single token store.
///
/// Android only. iOS terminates background sockets/timers.
class BackgroundOrderService {
  BackgroundOrderService._();

  static const String _restaurantIdKey = 'bg_restaurant_id';

  /// Last poll outcome, readable by the UI for on-device diagnostics.
  static const String lastStatusKey = 'bg_last_status';

  /// Last notification the service attempted to show (diagnostics).
  static const String lastNotifiedKey = 'bg_last_notified';
  /// Realtime is the instant path; this poll is the guarantee behind it.
  /// 45s keeps alerts prompt while roughly halving the wake-ups a 20s cycle
  /// cost the battery over a long shift.
  static const int pollIntervalMs = 45000;

  static void init() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'asn_background_service',
        channelName: 'Order Listener',
        channelDescription: 'Keeps listening for new orders while the app is closed.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: false,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(pollIntervalMs),
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
  }

  static const _secure = FlutterSecureStorage(aOptions: AndroidOptions());

  static Future<void> start(String restaurantId) async {
    await FlutterForegroundTask.saveData(key: _restaurantIdKey, value: restaurantId);
    // Second, independent copy: the plugin's store can come up empty in the
    // service isolate when Android auto-restarts it (boot / package replace).
    await _secure.write(key: _restaurantIdKey, value: restaurantId);

    if (await FlutterForegroundTask.isRunningService) {
      await FlutterForegroundTask.restartService();
      return;
    }

    await FlutterForegroundTask.startService(
      serviceId: 4401,
      notificationTitle: 'ASN — تنبيهات الطلبات',
      notificationText: 'في انتظار الطلبات الجديدة',
      callback: startOrderListenerCallback,
    );
  }

  static Future<void> stop() async {
    if (await FlutterForegroundTask.isRunningService) {
      await FlutterForegroundTask.stopService();
    }
  }

  static Future<bool> get isRunning => FlutterForegroundTask.isRunningService;

  /// The restaurant id the background service will use (for diagnostics).
  static Future<String?> storedRestaurantId() async {
    try {
      final fromTask = await FlutterForegroundTask.getData<String>(key: _restaurantIdKey);
      if (fromTask != null && fromTask.isNotEmpty) return fromTask;
    } catch (e) {
      AppLogger.warning('storedRestaurantId: task store unreadable: $e', name: 'BgOrders');
    }
    try {
      return await _secure.read(key: _restaurantIdKey);
    } catch (_) {
      return null;
    }
  }

  static Future<void> requestIgnoreBatteryOptimization() async {
    if (!await FlutterForegroundTask.isIgnoringBatteryOptimizations) {
      await FlutterForegroundTask.requestIgnoreBatteryOptimization();
    }
  }
}

@pragma('vm:entry-point')
void startOrderListenerCallback() {
  // Plugins (local notifications, secure storage) only work in this isolate
  // once the plugin registrant has been initialized here.
  DartPluginRegistrant.ensureInitialized();
  FlutterForegroundTask.setTaskHandler(_OrderListenerHandler());
}

class _OrderListenerHandler extends TaskHandler {
  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();

  String? _restaurantId;
  DateTime _lastSeenUtc = DateTime.now().toUtc();
  final Set<String> _notified = {};

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    await _initNotifications();
    _restaurantId = await _resolveRestaurantId();
    AppLogger.info('BgOrders started (restaurant=${_restaurantId ?? "?"})', name: 'BgOrders');
    // Do a first check right away instead of waiting a full interval.
    await onRepeatEvent(timestamp);
  }

  /// Android can auto-restart this service (boot / package replace) *before*
  /// the user has signed in, so the id may not exist yet. Re-resolve on every
  /// cycle — and check both stores — so the service heals itself instead of
  /// failing forever after one empty read.
  Future<String?> _resolveRestaurantId() async {
    try {
      final fromTask = await FlutterForegroundTask.getData<String>(
          key: BackgroundOrderService._restaurantIdKey);
      if (fromTask != null && fromTask.isNotEmpty) return fromTask;
    } catch (e) {
      AppLogger.warning('Task store unreadable, trying secure storage: $e', name: 'BgOrders');
    }
    try {
      final fromSecure =
          await BackgroundOrderService._secure.read(key: BackgroundOrderService._restaurantIdKey);
      if (fromSecure != null && fromSecure.isNotEmpty) return fromSecure;
    } catch (e) {
      AppLogger.warning('Secure store unreadable for restaurant id: $e', name: 'BgOrders');
    }
    return null;
  }

  Future<void> _initNotifications() async {
    const androidSettings = AndroidInitializationSettings('ic_notification');
    const initSettings = InitializationSettings(android: androidSettings);
    await _notifications.initialize(settings: initSettings);
    const channel = AndroidNotificationChannel(
      OrderAlert.channelId,
      OrderAlert.channelName,
      description: 'Notifications for new incoming orders',
      importance: Importance.max,
      playSound: true,
      enableVibration: true,
    );
    await _notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);
  }

  @override
  Future<void> onRepeatEvent(DateTime timestamp) async {
    // Self-heal: keep trying to pick up the id until the user has signed in.
    if (_restaurantId == null || _restaurantId!.isEmpty) {
      _restaurantId = await _resolveRestaurantId();
    }
    if (_restaurantId == null || _restaurantId!.isEmpty) {
      await _saveStatus(PollResult(
        ok: false,
        error: 'waiting for sign-in (no restaurant id yet)',
      ));
      return;
    }

    final result = await const OrderPollClient()
        .fetchNewOrders(restaurantId: _restaurantId!, sinceUtc: _lastSeenUtc);
    await _saveStatus(result);

    if (!result.ok) {
      AppLogger.warning('BgOrders poll: ${result.summary}', name: 'BgOrders');
      return;
    }

    for (final row in result.rows) {
      await _handleOrderRow(row);
      final created = DateTime.tryParse(row['created_at'] as String? ?? '')?.toUtc();
      if (created != null && created.isAfter(_lastSeenUtc)) _lastSeenUtc = created;
    }
  }

  /// Publishes the last poll outcome so the in-app diagnostics screen can
  /// show what the background service is actually doing.
  Future<void> _saveStatus(PollResult result) async {
    try {
      await FlutterForegroundTask.saveData(
        key: BackgroundOrderService.lastStatusKey,
        value: jsonEncode(result.toJson()),
      );
    } catch (e) {
      AppLogger.warning('Could not publish poll status: $e', name: 'BgOrders');
    }
  }

  Future<void> _handleOrderRow(Map<String, dynamic> order) async {
    final orderId = order['id']?.toString() ?? '';
    if (orderId.isEmpty || _notified.contains(orderId)) return;
    final alert = OrderAlert.fromOrder(order);
    if (alert == null) return; // draft / invalid
    _notified.add(orderId);

    // Awaited: a fire-and-forget platform call can be dropped when the
    // isolate goes idle right after the poll.
    try {
      await alert.show(_notifications);
      await _saveLastNotified('طلب #${order['order_number']} — ${DateTime.now()}');
    } catch (e) {
      await _saveLastNotified('فشل عرض الإشعار: $e');
      AppLogger.warning('BgOrders notify failed: $e', name: 'BgOrders');
    }
  }

  Future<void> _saveLastNotified(String value) async {
    try {
      await FlutterForegroundTask.saveData(
          key: BackgroundOrderService.lastNotifiedKey, value: value);
    } catch (e) {
      AppLogger.warning('Could not publish last-notified: $e', name: 'BgOrders');
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    AppLogger.info('BgOrders stopped', name: 'BgOrders');
  }
}

import 'dart:async';
import 'dart:convert';
import 'dart:ui';

import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/services/order_alert_builder.dart';
import 'package:asn_app/core/services/order_poll_client.dart';
import 'package:asn_app/core/services/order_realtime_listener.dart';

/// Keeps order alerts arriving when the app is closed — without Firebase.
///
/// Android will not wake a fully-closed app for a message unless it comes
/// through a push service (FCM) or the app runs a foreground service. Since
/// this platform is Supabase-only, we run a foreground service whose isolate
/// holds a Realtime subscription on the `orders` table — so an alert fires the
/// instant the row lands — with a periodic REST poll behind it as the
/// guarantee that nothing is ever missed if the socket drops.
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
  /// Realtime state (subscribed / error), readable by the UI for diagnostics.
  static const String realtimeStatusKey = 'bg_realtime_status';

  /// Whether the UI is on screen right now.
  ///
  /// Both this service and the in-app listener raise the same alert for a new
  /// order. Sharing one notification id keeps it to a single card, but the
  /// chime would still play twice. While the app is in front the in-app
  /// listener owns the alert and this service stays quiet; the moment the app
  /// is backgrounded or killed, this service takes over again.
  static const String appForegroundKey = 'bg_app_foreground';

  /// Called from the UI isolate on every lifecycle change.
  static Future<void> setAppForeground(bool inForeground) async {
    try {
      await FlutterForegroundTask.saveData(key: appForegroundKey, value: inForeground);
    } catch (e) {
      AppLogger.warning('Could not publish foreground state: $e', name: 'BgOrders');
    }
  }

  /// A notification tap this isolate received, waiting for the UI to act on it.
  ///
  /// Taps on a notification posted from here are delivered to this isolate,
  /// which cannot navigate. So it parks the payload and the UI picks it up the
  /// moment it is on screen — which is exactly when the tap brings it there.
  static const String pendingTapKey = 'bg_pending_tap';

  /// Reads and clears the parked tap. Null when there is nothing waiting.
  static Future<String?> takePendingTap() async {
    try {
      final raw = await FlutterForegroundTask.getData<String>(key: pendingTapKey);
      if (raw == null || raw.isEmpty) return null;
      await FlutterForegroundTask.removeData(key: pendingTapKey);
      return raw;
    } catch (e) {
      AppLogger.warning('Could not read the parked tap: $e', name: 'BgOrders');
      return null;
    }
  }

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
      notificationTitle: 'ASN Menu — تنبيهات الطلبات',
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
  OrderRealtimeListener? _realtime;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    await _initNotifications();
    _restaurantId = await _resolveRestaurantId();
    AppLogger.info('BgOrders started (restaurant=${_restaurantId ?? "?"})', name: 'BgOrders');
    // Do a first check right away instead of waiting a full interval. This
    // also opens the Realtime socket once the restaurant id is known.
    await onRepeatEvent(timestamp);
  }

  /// Opens the instant path, or reconnects it after a drop. Called from the
  /// poll cycle so the socket is re-established without its own timer, and so
  /// it always uses the token the poll just validated.
  Future<void> _syncRealtime(String accessToken) async {
    final listener = _realtime ??= OrderRealtimeListener(
      restaurantId: _restaurantId!,
      onInsert: _handleOrderRow,
    );
    // Only rebuild when the subscription is actually down. Restarting a healthy
    // one every cycle tore down a working channel and left the status reading
    // "closed" — a join still in flight counts as healthy for the same reason.
    if (listener.isConnected || listener.isStarting) {
      await listener.refreshAuth(accessToken);
    } else {
      await listener.start(accessToken);
    }
    try {
      await FlutterForegroundTask.saveData(
        key: BackgroundOrderService.realtimeStatusKey,
        value: listener.status,
      );
    } catch (e) {
      AppLogger.warning('Could not publish realtime status: $e', name: 'BgOrders');
    }
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
    await _notifications.initialize(
      settings: initSettings,
      // Without a handler here, tapping an alert this isolate posted just
      // brought the app to the front and went nowhere.
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );
    // Shared definition, so the chime is identical whichever path alerts.
    await _notifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(OrderAlert.channel());
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

    const client = OrderPollClient();
    // While the app is on screen its Supabase SDK owns the session; refreshing
    // from here as well would race it and revoke one side's token.
    final mayRefresh = !await _appIsInForeground();
    final result = await client.fetchNewOrders(
      restaurantId: _restaurantId!,
      sinceUtc: _lastSeenUtc,
      mayRefresh: mayRefresh,
    );
    await _saveStatus(result);

    if (!result.ok) {
      AppLogger.warning('BgOrders poll: ${result.summary}', name: 'BgOrders');
      return;
    }

    for (final row in result.rows) {
      await _handleOrderRow(row);
    }

    // Reuse the cycle that just proved the token works to open or re-auth the
    // instant path, so Realtime needs no timer of its own.
    final token = await client.currentAccessToken(mayRefresh: mayRefresh);
    if (token != null && token.isNotEmpty) await _syncRealtime(token);
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

  /// The single place an order becomes a notification, shared by the Realtime
  /// push and the poll — so a row that arrives on both paths alerts once.
  Future<void> _handleOrderRow(Map<String, dynamic> order) async {
    // Advance before the early returns: a draft that never alerts must still
    // move the watermark, or every poll refetches it forever.
    final created = DateTime.tryParse(order['created_at'] as String? ?? '')?.toUtc();
    if (created != null && created.isAfter(_lastSeenUtc)) _lastSeenUtc = created;

    final orderId = order['id']?.toString() ?? '';
    if (orderId.isEmpty || _notified.contains(orderId)) return;
    final alert = OrderAlert.fromOrder(order);
    if (alert == null) return; // draft / invalid

    // The in-app listener already alerted this one; a second show() would
    // replay the chime on a card the user is looking at.
    if (await _appIsInForeground()) {
      _notified.add(orderId);
      return;
    }

    _notified.add(orderId);
    // Bounded: a long shift must not grow this set without limit.
    if (_notified.length > 500) {
      _notified.remove(_notified.first);
    }

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

  /// Parks a tap for the UI isolate. This isolate has no navigator and no
  /// screen, so it records what was tapped and lets the UI carry it out.
  void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    if (payload == null || payload.isEmpty) return;
    unawaited(_parkTap(jsonEncode({
      'payload': payload,
      'actionId': response.actionId,
    })));
  }

  Future<void> _parkTap(String value) async {
    try {
      await FlutterForegroundTask.saveData(
          key: BackgroundOrderService.pendingTapKey, value: value);
    } catch (e) {
      AppLogger.warning('Could not park the tap: $e', name: 'BgOrders');
    }
  }

  /// Defaults to false: if the flag can't be read, alerting is the safer
  /// failure — a duplicate chime beats a missed order.
  Future<bool> _appIsInForeground() async {
    try {
      return await FlutterForegroundTask.getData<bool>(
              key: BackgroundOrderService.appForegroundKey) ??
          false;
    } catch (e) {
      AppLogger.warning('Could not read foreground state: $e', name: 'BgOrders');
      return false;
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
    await _realtime?.stop();
    _realtime = null;
    AppLogger.info('BgOrders stopped', name: 'BgOrders');
  }
}

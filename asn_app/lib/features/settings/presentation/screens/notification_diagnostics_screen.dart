import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter/services.dart';

import 'package:asn_app/core/logging/error_reporter.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/core/services/background_order_service.dart';
import 'package:asn_app/core/services/order_alert_builder.dart';
import 'package:asn_app/core/services/order_poll_client.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';

/// On-device diagnostics for order alerts — shows whether the background
/// listener is running, whether it can authenticate and read orders, and
/// lets the user fire a test notification. Removes the need for a USB cable
/// to work out why alerts aren't arriving.
class NotificationDiagnosticsScreen extends ConsumerStatefulWidget {
  const NotificationDiagnosticsScreen({super.key});

  @override
  ConsumerState<NotificationDiagnosticsScreen> createState() =>
      _NotificationDiagnosticsScreenState();
}

class _NotificationDiagnosticsScreenState
    extends ConsumerState<NotificationDiagnosticsScreen> {
  bool _loading = true;
  bool _serviceRunning = false;
  bool _batteryExempt = false;
  bool? _notificationsEnabled;
  PollResult? _lastBackgroundPoll;
  PollResult? _manualCheck;
  bool _checking = false;
  String? _bgRestaurantId;
  String? _lastNotified;
  String _testResult = '';

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    final running = await BackgroundOrderService.isRunning;
    final exempt = await FlutterForegroundTask.isIgnoringBatteryOptimizations;

    bool? notifEnabled;
    try {
      notifEnabled = await FlutterLocalNotificationsPlugin()
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.areNotificationsEnabled();
    } catch (_) {
      // Diagnostics only: a missing value renders as "unknown".
    }

    PollResult? lastPoll;
    try {
      final raw = await FlutterForegroundTask.getData<String>(
          key: BackgroundOrderService.lastStatusKey);
      lastPoll = PollResult.fromJsonString(raw);
    } catch (_) {
      // Diagnostics only: a missing value renders as "unknown".
    }

    final bgRid = await BackgroundOrderService.storedRestaurantId();
    String? lastNotified;
    try {
      lastNotified = await FlutterForegroundTask.getData<String>(
          key: BackgroundOrderService.lastNotifiedKey);
    } catch (_) {
      // Diagnostics only: a missing value renders as "unknown".
    }

    if (!mounted) return;
    setState(() {
      _serviceRunning = running;
      _batteryExempt = exempt;
      _notificationsEnabled = notifEnabled;
      _lastBackgroundPoll = lastPoll;
      _bgRestaurantId = bgRid;
      _lastNotified = lastNotified;
      _loading = false;
    });
  }

  String? get _restaurantId => ref.read(authNotifierProvider).maybeWhen(
        authenticated: (u) => u.restaurantId,
        orElse: () => null,
      );

  /// Runs the exact query the background service uses, so a failure here is
  /// the same failure the service would hit.
  Future<void> _runManualCheck() async {
    final rid = _restaurantId;
    if (rid == null) {
      showAppSnackBar(context, 'لا يوجد مطعم مرتبط بالحساب', type: AppSnackBarType.error);
      return;
    }
    setState(() => _checking = true);
    final result = await const OrderPollClient().fetchNewOrders(
      restaurantId: rid,
      // Look back 24h so an existing order proves the query works.
      sinceUtc: DateTime.now().toUtc().subtract(const Duration(hours: 24)),
    );
    if (!mounted) return;
    setState(() {
      _manualCheck = result;
      _checking = false;
    });
  }

  /// [rich] = the full order alert (style + action button).
  /// Plain = the most minimal notification possible. If plain works but rich
  /// doesn't, the fault is in the notification content, not the OS.
  Future<void> _sendTestNotification({required bool rich}) async {
    setState(() => _testResult = '⏳ جاري الإرسال...');
    try {
      final plugin = FlutterLocalNotificationsPlugin();
      const androidInit = AndroidInitializationSettings('ic_notification');
      final inited =
          await plugin.initialize(settings: const InitializationSettings(android: androidInit));

      final android =
          plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      await android?.createNotificationChannel(const AndroidNotificationChannel(
        OrderAlert.channelId,
        OrderAlert.channelName,
        description: 'Notifications for new incoming orders',
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      ));
      final enabled = await android?.areNotificationsEnabled();

      if (rich) {
        final alert = OrderAlert.fromOrder({
          'id': 'test-${DateTime.now().millisecondsSinceEpoch}',
          'order_number': '9999',
          'customer_name': 'عميل تجريبي',
          'customer_phone': '01000000000',
          'total': 250,
          'items': [
            {'title': 'برجر', 'qty': 2},
            {'title': 'بيتزا', 'qty': 1},
          ],
        });
        if (alert == null) {
          setState(() => _testResult = '❌ فشل بناء الإشعار');
          return;
        }
        await alert.show(plugin);
      } else {
        await plugin.show(
          id: 12345,
          title: 'اختبار بسيط',
          body: 'لو شفت ده يبقى الإشعارات شغّالة',
          notificationDetails: const NotificationDetails(
            android: AndroidNotificationDetails(
              OrderAlert.channelId,
              OrderAlert.channelName,
              importance: Importance.max,
              priority: Priority.high,
            ),
          ),
        );
      }

      setState(() => _testResult =
          '✅ تم الإرسال بدون أخطاء\ninit=$inited • enabled=$enabled • ${DateTime.now()}');
    } catch (e, st) {
      setState(() => _testResult = '❌ خطأ: $e\n$st');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('تشخيص الإشعارات'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _refresh),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                _statusTile(
                  'خدمة التنبيهات في الخلفية',
                  _serviceRunning ? 'شغّالة' : 'متوقفة',
                  _serviceRunning,
                ),
                _statusTile(
                  'استثناء توفير البطارية',
                  _batteryExempt ? 'مفعّل' : 'غير مفعّل — لازم تفعّله',
                  _batteryExempt,
                ),
                _statusTile(
                  'إذن الإشعارات',
                  _notificationsEnabled == null
                      ? 'غير معروف'
                      : (_notificationsEnabled! ? 'مسموح' : 'محظور — فعّله من الإعدادات'),
                  _notificationsEnabled ?? false,
                ),
                _statusTile(
                  'رقم المطعم في الخلفية',
                  _bgRestaurantId?.isNotEmpty == true
                      ? _bgRestaurantId!
                      : 'غير محفوظ — سجّل الدخول مرة أخرى',
                  _bgRestaurantId?.isNotEmpty == true,
                ),
                const Divider(height: AppSpacing.xl),

                Text('آخر فحص من الخلفية', style: Theme.of(context).textTheme.titleMedium),
                AppSpacing.heightXs,
                _resultCard(_lastBackgroundPoll,
                    empty: 'لم تسجّل الخدمة أي فحص بعد. انتظر ٢٠ ثانية ثم حدّث.'),
                AppSpacing.heightLg,

                AppSpacing.heightSm,
                Text('آخر إشعار حاولت الخلفية عرضه',
                    style: Theme.of(context).textTheme.titleMedium),
                AppSpacing.heightXs,
                Text(
                  _lastNotified?.isNotEmpty == true
                      ? _lastNotified!
                      : 'لم تحاول الخدمة عرض أي إشعار بعد.',
                  style: const TextStyle(fontSize: 12),
                ),
                AppSpacing.heightLg,

                Text('فحص يدوي الآن', style: Theme.of(context).textTheme.titleMedium),
                AppSpacing.heightXs,
                Text(
                  'يشغّل نفس استعلام الخلفية بالظبط (آخر ٢٤ ساعة).',
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
                AppSpacing.heightXs,
                _resultCard(_manualCheck, empty: 'اضغط "افحص الآن".'),
                AppSpacing.heightSm,
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: _checking ? null : _runManualCheck,
                        icon: _checking
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                            : const Icon(Icons.cloud_sync, size: 18),
                        label: const Text('افحص الآن'),
                      ),
                    ),
                    AppSpacing.widthSm,
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => _sendTestNotification(rich: true),
                        icon: const Icon(Icons.notifications_active_outlined, size: 18),
                        label: const Text('إشعار كامل'),
                      ),
                    ),
                  ],
                ),
                AppSpacing.heightSm,
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _sendTestNotification(rich: false),
                    icon: const Icon(Icons.notifications_none, size: 18),
                    label: const Text('إشعار بسيط جداً (اختبار)'),
                  ),
                ),
                AppSpacing.heightLg,
                const Divider(),
                AppSpacing.heightSm,
                Row(
                  children: [
                    Expanded(
                      child: Text('سجل الأخطاء',
                          style: Theme.of(context).textTheme.titleMedium),
                    ),
                    TextButton.icon(
                      onPressed: () async {
                        final dump = await ErrorReporter.export();
                        await Clipboard.setData(ClipboardData(text: dump));
                        if (context.mounted) {
                          showAppSnackBar(context, 'تم نسخ سجل الأخطاء',
                              type: AppSnackBarType.success);
                        }
                      },
                      icon: const Icon(Icons.copy_all, size: 16),
                      label: const Text('نسخ'),
                    ),
                    TextButton(
                      onPressed: () async {
                        await ErrorReporter.clear();
                        if (context.mounted) setState(() {});
                      },
                      child: const Text('مسح'),
                    ),
                  ],
                ),
                FutureBuilder<List<String>>(
                  future: ErrorReporter.readAll(),
                  builder: (context, snapshot) {
                    final entries = snapshot.data ?? const <String>[];
                    if (entries.isEmpty) {
                      return const Text('لا توجد أخطاء مسجّلة ✅',
                          style: TextStyle(fontSize: 12, color: Colors.grey));
                    }
                    return Column(
                      children: entries.take(5).map((e) {
                        return Container(
                          width: double.infinity,
                          margin: const EdgeInsets.only(bottom: AppSpacing.xs),
                          padding: const EdgeInsets.all(AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: AppColors.error.withValues(alpha: 0.06),
                            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                          ),
                          child: Text(e,
                              maxLines: 6,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(fontSize: 10, height: 1.4)),
                        );
                      }).toList(),
                    );
                  },
                ),
                if (_testResult.isNotEmpty) ...[
                  AppSpacing.heightSm,
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: Colors.grey.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                    ),
                    child: SelectableText(
                      _testResult,
                      style: const TextStyle(fontSize: 11, height: 1.5),
                    ),
                  ),
                ],
                AppSpacing.heightLg,
                Container(
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  decoration: BoxDecoration(
                    color: AppColors.info.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                  child: const Text(
                    'لو "إشعار تجريبي" مجاش: المشكلة في إعدادات الهاتف (الإشعارات محظورة).\n'
                    'لو جه، لكن "الفحص" بيرجع خطأ: المشكلة في الاتصال أو تسجيل الدخول.\n'
                    'لو الاتنين تمام والطلبات مش بتوصل: فعّل التشغيل التلقائي واقفل التطبيق في قائمة الأخيرة.',
                    style: TextStyle(fontSize: 12, height: 1.6),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _statusTile(String title, String value, bool ok) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(
        ok ? Icons.check_circle : Icons.cancel,
        color: ok ? AppColors.success : AppColors.error,
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
      subtitle: Text(value, style: const TextStyle(fontSize: 12)),
    );
  }

  Widget _resultCard(PollResult? result, {required String empty}) {
    if (result == null) {
      return Text(empty, style: const TextStyle(fontSize: 12, color: Colors.grey));
    }
    final ok = result.ok;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: (ok ? AppColors.success : AppColors.error).withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(
          color: (ok ? AppColors.success : AppColors.error).withValues(alpha: 0.4),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            result.summary,
            style: TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 13,
              color: ok ? AppColors.success : AppColors.error,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'الوقت: ${result.at.toLocal()}',
            style: const TextStyle(fontSize: 11, color: Colors.grey),
          ),
          if (result.error != null) ...[
            const SizedBox(height: 4),
            Text(
              result.error!,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11),
            ),
          ],
        ],
      ),
    );
  }
}

import 'dart:async';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';

class OrderNotificationService {
  final SupabaseClient _supabase;
  final FlutterLocalNotificationsPlugin _localNotifications;
  RealtimeChannel? _ordersChannel;
  String? _currentRestaurantId;

  OrderNotificationService(this._supabase, this._localNotifications);

  Future<void> initialize() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    const initSettings = InitializationSettings(android: androidSettings, iOS: iosSettings);
    
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (details) {
        AppLogger.info('Notification clicked: ${details.payload}', name: 'OrderNotification');
      },
    );
  }

  void startListening(String restaurantId) {
    if (_currentRestaurantId == restaurantId && _ordersChannel != null) {
      return; // Already listening
    }
    
    stopListening();
    _currentRestaurantId = restaurantId;

    _ordersChannel = _supabase
        .channel('public:orders:tenant_$restaurantId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'orders',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'tenant_id',
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
    final newOrder = payload.newRecord;
    final orderId = newOrder['id']?.toString() ?? 'Unknown';
    final customerName = newOrder['customer_name'] ?? 'Customer';
    final total = newOrder['total']?.toString() ?? '0.0';

    AppLogger.info('New order received: $orderId', name: 'OrderNotification');

    const androidDetails = AndroidNotificationDetails(
      'orders_channel',
      'New Orders',
      channelDescription: 'Notifications for new incoming orders',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
      enableVibration: true,
    );
    
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _localNotifications.show(
      newOrder['id']?.hashCode ?? 0,
      'طلب جديد! 🚀',
      'طلب جديد من $customerName بقيمة $total جنيه',
      details,
      payload: '/orders/$orderId',
    );
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

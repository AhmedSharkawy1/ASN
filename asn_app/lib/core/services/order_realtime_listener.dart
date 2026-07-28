import 'dart:async';

import 'package:realtime_client/realtime_client.dart';

import 'package:asn_app/core/config/app_config.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/services/order_poll_client.dart';

/// Pushes new orders to the background isolate the moment they are inserted.
///
/// The periodic poll is the guarantee that an order is never missed; this is
/// what makes the alert arrive *now* rather than up to one poll apart. It is
/// built on [RealtimeClient] directly instead of the Supabase SDK for the same
/// reason [OrderPollClient] is: two isolates running the SDK would fight over
/// refresh-token rotation and quietly leave this one unauthenticated.
///
/// A failure here is never fatal — if Realtime is unreachable, or the `orders`
/// table was never added to the `supabase_realtime` publication, the listener
/// reports it and the poll carries the load unchanged.
class OrderRealtimeListener {
  final String restaurantId;
  final Future<void> Function(Map<String, dynamic> order) onInsert;

  /// Last subscribe outcome, surfaced in the on-device diagnostics screen so a
  /// missing publication is visible without a USB cable.
  String status = 'not started';

  RealtimeClient? _client;
  RealtimeChannel? _channel;
  String? _token;

  OrderRealtimeListener({required this.restaurantId, required this.onInsert});

  bool get isConnected => _client?.isConnected ?? false;

  Future<void> start(String accessToken) async {
    await stop();
    _token = accessToken;

    try {
      final client = RealtimeClient(
        '${AppConfig.supabaseUrl}/realtime/v1',
        params: {'apikey': AppConfig.supabaseAnonKey},
        headers: {'apikey': AppConfig.supabaseAnonKey},
        // Reconnect briskly: a dropped socket during service means silence.
        reconnectAfterMs: (tries) => const [1000, 2000, 5000, 10000][
            tries > 4 ? 3 : tries - 1],
      );
      _client = client;
      await client.setAuth(accessToken);

      _channel = client
          .channel('bg-orders-$restaurantId')
          .onPostgresChanges(
            event: PostgresChangeEvent.insert,
            schema: 'public',
            table: 'orders',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'restaurant_id',
              value: restaurantId,
            ),
            callback: _onPayload,
          )
          .subscribe((state, error) {
            status = error == null ? state.name : '${state.name}: $error';
            if (error != null) {
              AppLogger.warning('BgRealtime $status', name: 'BgOrders');
            } else {
              AppLogger.info('BgRealtime $status', name: 'BgOrders');
            }
          });
    } catch (e) {
      status = 'failed to start: $e';
      AppLogger.warning('BgRealtime $status', name: 'BgOrders');
    }
  }

  void _onPayload(PostgresChangePayload payload) {
    final row = payload.newRecord;
    if (row.isEmpty) return;
    // The handler dedupes against the poll, so a row arriving on both paths
    // still only ever produces one notification.
    unawaited(onInsert(row).catchError((Object e) {
      AppLogger.warning('BgRealtime handler failed: $e', name: 'BgOrders');
    }));
  }

  /// Keeps the socket authenticated after the poll rotates the access token.
  /// An expired JWT makes the server drop the subscription silently.
  Future<void> refreshAuth(String accessToken) async {
    if (accessToken == _token) return;
    _token = accessToken;
    try {
      await _client?.setAuth(accessToken);
    } catch (e) {
      AppLogger.warning('BgRealtime re-auth failed, restarting: $e', name: 'BgOrders');
      await start(accessToken);
    }
  }

  /// Brings the socket back after a drop. Cheap when already connected.
  Future<void> ensureConnected(String accessToken) async {
    if (isConnected) return;
    await start(accessToken);
  }

  Future<void> stop() async {
    try {
      final channel = _channel;
      if (channel != null) await channel.unsubscribe();
      await _client?.disconnect();
    } catch (e) {
      AppLogger.warning('BgRealtime stop failed: $e', name: 'BgOrders');
    } finally {
      _channel = null;
      _client = null;
    }
  }
}

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

  /// Tracked from the subscribe callback rather than read off the channel,
  /// whose state getters are package-internal.
  bool _joined = false;
  bool _joining = false;

  OrderRealtimeListener({required this.restaurantId, required this.onInsert});

  /// Live means the channel actually joined the topic. An open socket is not
  /// enough — a connected socket with a closed channel receives nothing.
  bool get isConnected => (_client?.isConnected ?? false) && _joined;

  /// Mid-handshake. Treated as healthy so a poll cycle landing during the join
  /// does not tear down a subscription that is about to succeed.
  bool get isStarting => _joining;

  Future<void> start(String accessToken) async {
    await stop();
    _token = accessToken;
    // Published before the handshake finishes. The status is read straight
    // after this returns, and leaving it on the initial value made an attempt
    // in progress indistinguishable from never having tried.
    status = 'connecting';

    try {
      final client = RealtimeClient(
        '${AppConfig.supabaseUrl}/realtime/v1',
        params: {'apikey': AppConfig.supabaseAnonKey},
        headers: {'apikey': AppConfig.supabaseAnonKey},
        // Reconnect briskly: a dropped socket during service means silence.
        // Clamped both ends — the library counts attempts from 1, but an
        // out-of-range index here would throw inside a timer we cannot catch.
        reconnectAfterMs: (tries) {
          const backoff = [1000, 2000, 5000, 10000];
          final i = (tries - 1).clamp(0, backoff.length - 1);
          return backoff[i];
        },
      );
      _client = client;
      await client.setAuth(accessToken);

      final channel = client.channel('bg-orders-$restaurantId');
      _channel = channel;
      _joining = true;
      _joined = false;
      channel
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
            // A channel we have already replaced still reports `closed` when it
            // unsubscribes. Letting that through overwrote the live channel's
            // "subscribed" with "closed", which is what the diagnostics screen
            // was showing.
            if (!identical(_channel, channel)) return;
            _joining = false;
            _joined = state == RealtimeSubscribeStatus.subscribed;
            status = error == null ? state.name : '${state.name}: $error';
            if (error != null) {
              AppLogger.warning('BgRealtime $status', name: 'BgOrders');
            } else {
              AppLogger.info('BgRealtime $status', name: 'BgOrders');
            }
          });
    } catch (e) {
      _joining = false;
      _joined = false;
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
    // Cleared first so the outgoing channel's `closed` callback is recognised
    // as stale and cannot overwrite the status of whatever replaces it.
    final channel = _channel;
    final client = _client;
    _channel = null;
    _client = null;
    _joined = false;
    _joining = false;
    try {
      if (channel != null) await channel.unsubscribe();
      await client?.disconnect();
    } catch (e) {
      AppLogger.warning('BgRealtime stop failed: $e', name: 'BgOrders');
    }
  }
}

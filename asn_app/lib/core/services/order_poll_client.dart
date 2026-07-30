import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:asn_app/core/config/app_config.dart';

/// Result of one authenticated poll attempt — carries enough detail to
/// diagnose failures on-device without a USB cable.
class PollResult {
  final bool ok;
  final int httpStatus;
  final int rowCount;
  final String? error;
  final List<Map<String, dynamic>> rows;
  final DateTime at;

  PollResult({
    required this.ok,
    this.httpStatus = 0,
    this.rowCount = 0,
    this.error,
    this.rows = const [],
    DateTime? at,
  }) : at = at ?? DateTime.now();

  String get summary {
    if (ok) return 'OK — HTTP $httpStatus — $rowCount order(s)';
    return 'FAILED — HTTP $httpStatus — ${error ?? "unknown"}';
  }

  Map<String, dynamic> toJson() => {
        'ok': ok,
        'httpStatus': httpStatus,
        'rowCount': rowCount,
        'error': error,
        'at': at.toIso8601String(),
      };

  static PollResult? fromJsonString(String? raw) {
    if (raw == null || raw.isEmpty) return null;
    try {
      final j = jsonDecode(raw) as Map<String, dynamic>;
      return PollResult(
        ok: j['ok'] as bool? ?? false,
        httpStatus: (j['httpStatus'] as num? ?? 0).toInt(),
        rowCount: (j['rowCount'] as num? ?? 0).toInt(),
        error: j['error'] as String?,
        at: DateTime.tryParse(j['at'] as String? ?? '') ?? DateTime.now(),
      );
    } catch (_) {
      return null;
    }
  }
}

/// Outcome of a token refresh, carrying the server's reason when it failed.
class RefreshResult {
  final String? token;
  final int status;
  final String? error;

  const RefreshResult({this.token, this.status = 0, this.error});
}

/// Reads new orders over plain authenticated REST.
///
/// Deliberately avoids the Supabase SDK: the background isolate and the UI
/// isolate would otherwise fight over refresh-token rotation, silently
/// leaving the background one unauthenticated.
class OrderPollClient {
  static const _storage = FlutterSecureStorage(aOptions: AndroidOptions());
  static const String accessTokenKey = 'jwt_auth_token';
  static const String refreshTokenKey = 'jwt_refresh_token';

  const OrderPollClient();

  /// [mayRefresh] false means "the app is on screen": its Supabase SDK owns
  /// the session and is refreshing on its own schedule. Refreshing here too
  /// would race it — Supabase rotates the refresh token and revokes the one it
  /// replaces, so whichever side used the older copy is left permanently
  /// unauthenticated, which is what "token refresh failed" was. When the app
  /// is on screen this client only reads what the SDK has already stored.
  Future<PollResult> fetchNewOrders({
    required String restaurantId,
    required DateTime sinceUtc,
    bool mayRefresh = true,
  }) async {
    try {
      var token = await _storage.read(key: accessTokenKey);
      if (token == null || token.isEmpty) {
        if (!mayRefresh) {
          return PollResult(ok: false, error: 'waiting for the app to sign in');
        }
        final refreshed = await refreshAccessToken();
        if (refreshed.token == null) {
          return PollResult(
            ok: false,
            httpStatus: refreshed.status,
            error: refreshed.error ?? 'no session token (login required)',
          );
        }
        token = refreshed.token;
      }

      final url = '${AppConfig.supabaseUrl}/rest/v1/orders'
          '?select=id,order_number,customer_name,customer_phone,customer_address,notes,'
          'total,subtotal,discount,delivery_fee,payment_method,order_type,delivery_zone_name,items,is_draft,created_at'
          '&restaurant_id=eq.$restaurantId'
          '&created_at=gt.${Uri.encodeQueryComponent(sinceUtc.toIso8601String())}'
          '&order=created_at.asc';

      var res = await _get(url, token!);
      if (res.status == 401) {
        if (!mayRefresh) {
          // The SDK refreshes within the minute; alerting resumes then.
          return PollResult(
            ok: false,
            httpStatus: 401,
            error: 'token expired — waiting for the app to refresh it',
          );
        }
        final refreshed = await refreshAccessToken();
        if (refreshed.token == null) {
          return PollResult(
            ok: false,
            httpStatus: refreshed.status,
            // Carries the server's own reason, so a rotated-away token reads
            // differently from a network failure on the diagnostics screen.
            error: 'token refresh failed — ${refreshed.error ?? "unknown"}',
          );
        }
        res = await _get(url, refreshed.token!);
      }

      if (res.status != 200) {
        return PollResult(ok: false, httpStatus: res.status, error: res.body);
      }

      final rows = (jsonDecode(res.body) as List).whereType<Map<String, dynamic>>().toList();
      return PollResult(ok: true, httpStatus: 200, rowCount: rows.length, rows: rows);
    } catch (e) {
      return PollResult(ok: false, error: e.toString());
    }
  }

  /// A token the caller can authenticate a socket with. Refreshes only when
  /// allowed to — see [fetchNewOrders] for why that matters.
  Future<String?> currentAccessToken({bool mayRefresh = true}) async {
    final token = await _storage.read(key: accessTokenKey);
    if (token != null && token.isNotEmpty) return token;
    if (!mayRefresh) return null;
    return (await refreshAccessToken()).token;
  }

  /// Exchanges the stored refresh token for a new session, persisting both
  /// tokens so the app and the background isolate stay in sync.
  ///
  /// Reports why it failed rather than returning a bare null: "refresh token
  /// already used" (the two sides raced) and "no network" both used to surface
  /// as the same unhelpful message.
  Future<RefreshResult> refreshAccessToken() async {
    final refreshToken = await _storage.read(key: refreshTokenKey);
    if (refreshToken == null || refreshToken.isEmpty) {
      return const RefreshResult(error: 'no refresh token stored (sign in again)');
    }

    final client = HttpClient();
    try {
      final req = await client.postUrl(
        Uri.parse('${AppConfig.supabaseUrl}/auth/v1/token?grant_type=refresh_token'),
      );
      req.headers.set('apikey', AppConfig.supabaseAnonKey);
      req.headers.set('Content-Type', 'application/json');
      req.add(utf8.encode(jsonEncode({'refresh_token': refreshToken})));
      final resp = await req.close();
      final body = await resp.transform(utf8.decoder).join();
      if (resp.statusCode != 200) {
        return RefreshResult(status: resp.statusCode, error: _reasonFrom(body));
      }

      final json = jsonDecode(body) as Map<String, dynamic>;
      final newAccess = json['access_token'] as String?;
      final newRefresh = json['refresh_token'] as String?;
      if (newAccess == null || newAccess.isEmpty) {
        return RefreshResult(status: resp.statusCode, error: 'response carried no token');
      }
      await _storage.write(key: accessTokenKey, value: newAccess);
      if (newRefresh != null && newRefresh.isNotEmpty) {
        await _storage.write(key: refreshTokenKey, value: newRefresh);
      }
      return RefreshResult(token: newAccess, status: resp.statusCode);
    } catch (e) {
      return RefreshResult(error: e.toString());
    } finally {
      client.close();
    }
  }

  /// Pulls the human-readable part out of a GoTrue error body.
  static String _reasonFrom(String body) {
    try {
      final json = jsonDecode(body) as Map<String, dynamic>;
      final msg = (json['error_description'] ?? json['msg'] ?? json['message'] ?? json['error'])
          ?.toString();
      if (msg != null && msg.isNotEmpty) return msg;
    } catch (_) {
      // Not JSON — fall through to the raw body.
    }
    return body.length > 120 ? '${body.substring(0, 120)}…' : body;
  }

  Future<({int status, String body})> _get(String url, String accessToken) async {
    final client = HttpClient();
    try {
      final req = await client.getUrl(Uri.parse(url));
      req.headers.set('apikey', AppConfig.supabaseAnonKey);
      req.headers.set('Authorization', 'Bearer $accessToken');
      req.headers.set('Accept', 'application/json');
      final resp = await req.close();
      final body = await resp.transform(utf8.decoder).join();
      return (status: resp.statusCode, body: body);
    } finally {
      client.close();
    }
  }
}

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

  Future<PollResult> fetchNewOrders({
    required String restaurantId,
    required DateTime sinceUtc,
  }) async {
    try {
      var token = await _storage.read(key: accessTokenKey);
      if (token == null || token.isEmpty) {
        token = await refreshAccessToken();
        if (token == null) {
          return PollResult(ok: false, error: 'no session token (login required)');
        }
      }

      final url = '${AppConfig.supabaseUrl}/rest/v1/orders'
          '?select=id,order_number,customer_name,customer_phone,customer_address,notes,'
          'total,subtotal,discount,delivery_fee,payment_method,order_type,items,is_draft,created_at'
          '&restaurant_id=eq.$restaurantId'
          '&created_at=gt.${Uri.encodeQueryComponent(sinceUtc.toIso8601String())}'
          '&order=created_at.asc';

      var res = await _get(url, token);
      if (res.status == 401) {
        final refreshed = await refreshAccessToken();
        if (refreshed == null) {
          return PollResult(ok: false, httpStatus: 401, error: 'token refresh failed');
        }
        res = await _get(url, refreshed);
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

  /// Exchanges the stored refresh token for a new session, persisting both
  /// tokens so the app and the background isolate stay in sync.
  Future<String?> refreshAccessToken() async {
    final refreshToken = await _storage.read(key: refreshTokenKey);
    if (refreshToken == null || refreshToken.isEmpty) return null;

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
      if (resp.statusCode != 200) return null;

      final json = jsonDecode(body) as Map<String, dynamic>;
      final newAccess = json['access_token'] as String?;
      final newRefresh = json['refresh_token'] as String?;
      if (newAccess != null && newAccess.isNotEmpty) {
        await _storage.write(key: accessTokenKey, value: newAccess);
      }
      if (newRefresh != null && newRefresh.isNotEmpty) {
        await _storage.write(key: refreshTokenKey, value: newRefresh);
      }
      return newAccess;
    } catch (_) {
      return null;
    } finally {
      client.close();
    }
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

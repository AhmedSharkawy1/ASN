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

  /// Caches a refresh token that GoTrue rejected with HTTP 400 (invalid_grant / revoked).
  /// Prevents repeatedly spamming the server with doomed requests and inflating log usage.
  static String? _knownBadRefreshToken;
  static DateTime? _lastBadTokenAttempt;

  /// Resets the dead-token cache when a new session is established or user signs in.
  static void resetBadToken() {
    _knownBadRefreshToken = null;
    _lastBadTokenAttempt = null;
  }

  /// Decodes JWT payload and checks if it is expired or will expire within 30 seconds.
  static bool isJwtExpired(String token) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return true;
      final normalized = base64Url.normalize(parts[1]);
      final payload = utf8.decode(base64Url.decode(normalized));
      final map = jsonDecode(payload) as Map<String, dynamic>;
      final exp = map['exp'] as int?;
      if (exp == null) return false;
      return DateTime.now().toUtc().millisecondsSinceEpoch >= (exp * 1000 - 30000);
    } catch (_) {
      return false;
    }
  }

  const OrderPollClient();

  /// New orders since [sinceUtc].
  Future<PollResult> fetchNewOrders({
    required String restaurantId,
    required DateTime sinceUtc,
    bool mayRefresh = true,
  }) {
    final url = '${AppConfig.supabaseUrl}/rest/v1/orders'
        '?select=id,order_number,customer_name,customer_phone,customer_address,notes,'
        'total,subtotal,discount,delivery_fee,payment_method,order_type,delivery_zone_name,items,is_draft,created_at'
        '&restaurant_id=eq.$restaurantId'
        '&created_at=gt.${Uri.encodeQueryComponent(sinceUtc.toIso8601String())}'
        '&order=created_at.asc';
    return _fetchRows(url, mayRefresh: mayRefresh);
  }

  /// Waiter calls raised from the menu since [sinceUtc]. Only the ones nobody
  /// has answered yet — a resolved call must not ring a second time.
  Future<PollResult> fetchWaiterCalls({
    required String restaurantId,
    required DateTime sinceUtc,
    bool mayRefresh = true,
  }) {
    final url = '${AppConfig.supabaseUrl}/rest/v1/waiter_calls'
        '?select=id,table_number,status,note,created_at'
        '&restaurant_id=eq.$restaurantId'
        '&status=eq.pending'
        '&created_at=gt.${Uri.encodeQueryComponent(sinceUtc.toIso8601String())}'
        '&order=created_at.asc';
    return _fetchRows(url, mayRefresh: mayRefresh);
  }

  /// One authenticated GET with proactive token refresh.
  /// If the token is already expired or session is dead, we NEVER send an invalid
  /// request to Supabase to avoid bloating Edge logs with 401 warnings.
  Future<PollResult> _fetchRows(String url, {bool mayRefresh = true}) async {
    try {
      // 1. If session is known to be dead, abort immediately without touching the network
      if (_knownBadRefreshToken != null) {
        return PollResult(
          ok: false,
          httpStatus: 401,
          error: 'session expired (sign in required to resume alerts)',
        );
      }

      var token = await _storage.read(key: accessTokenKey);

      // 2. Pre-flight check: if token is missing or expired, refresh BEFORE making any GET request!
      final needsRefresh = token == null || token.isEmpty || isJwtExpired(token);
      if (needsRefresh) {
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

      // 3. Make the authenticated request
      var res = await _get(url, token!);
      if (res.status == 401) {
        if (!mayRefresh) {
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

  /// A token the caller can authenticate a socket with.
  Future<String?> currentAccessToken({bool mayRefresh = true}) async {
    if (_knownBadRefreshToken != null) return null;
    final token = await _storage.read(key: accessTokenKey);
    if (token != null && token.isNotEmpty && !isJwtExpired(token)) {
      return token;
    }
    if (!mayRefresh) return null;
    return (await refreshAccessToken()).token;
  }

  /// Exchanges the stored refresh token for a new session, persisting both
  /// tokens so the app and the background isolate stay in sync.
  Future<RefreshResult> refreshAccessToken() async {
    final refreshToken = await _storage.read(key: refreshTokenKey);
    if (refreshToken == null || refreshToken.isEmpty) {
      return const RefreshResult(error: 'no refresh token stored (sign in again)');
    }

    // If this token was already rejected with 400 (invalid_grant), throttle retries for 15 minutes
    if (_knownBadRefreshToken == refreshToken && _lastBadTokenAttempt != null) {
      if (DateTime.now().difference(_lastBadTokenAttempt!) < const Duration(minutes: 15)) {
        return const RefreshResult(
          status: 400,
          error: 'session expired — sign in again to resume background alerts',
        );
      }
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
        if (resp.statusCode == 400 || resp.statusCode == 401) {
          _knownBadRefreshToken = refreshToken;
          _lastBadTokenAttempt = DateTime.now();
          // Purge dead tokens from storage so we NEVER send expired/revoked JWTs over the wire again!
          await _storage.delete(key: accessTokenKey);
          await _storage.delete(key: refreshTokenKey);
        }
        return RefreshResult(status: resp.statusCode, error: _reasonFrom(body));
      }

      // Successful refresh clears any bad-token marker
      _knownBadRefreshToken = null;
      _lastBadTokenAttempt = null;

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

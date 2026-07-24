import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:asn_app/core/logging/logger.dart';

class SecureStorage {
  final FlutterSecureStorage _storage;

  SecureStorage([FlutterSecureStorage? storage])
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock,
              ),
            );

  static const String _tokenKey = 'jwt_auth_token';
  static const String _refreshTokenKey = 'jwt_refresh_token';
  static const String _offlinePwKey = 'offline_pw_cached';

  Future<void> write(String key, String value) async {
    try {
      await _storage.write(key: key, value: value);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to write to secure storage', error: e, stackTrace: stackTrace, name: 'SecureStorage');
    }
  }

  Future<String?> read(String key) async {
    try {
      return await _storage.read(key: key);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to read from secure storage', error: e, stackTrace: stackTrace, name: 'SecureStorage');
      return null;
    }
  }

  Future<void> delete(String key) async {
    try {
      await _storage.delete(key: key);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete from secure storage', error: e, stackTrace: stackTrace, name: 'SecureStorage');
    }
  }

  Future<void> clearAll() async {
    try {
      await _storage.deleteAll();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to clear secure storage', error: e, stackTrace: stackTrace, name: 'SecureStorage');
    }
  }

  // Token Helpers
  Future<void> saveAuthToken(String token) => write(_tokenKey, token);
  Future<String?> getAuthToken() => read(_tokenKey);
  Future<void> deleteAuthToken() => delete(_tokenKey);

  Future<void> saveRefreshToken(String token) => write(_refreshTokenKey, token);
  Future<String?> getRefreshToken() => read(_refreshTokenKey);
  Future<void> deleteRefreshToken() => delete(_refreshTokenKey);

  // ---------------------------------------------------------------------
  // Offline login credential
  //
  // Stored as `salt:sha256(salt + password)` — never the password itself.
  // Offline sign-in only needs to *verify* the password, so there is no
  // reason to keep a recoverable copy on the device.
  // ---------------------------------------------------------------------

  Future<void> saveOfflinePasswordHash(String pw) async {
    final salt = _newSalt();
    await write(_offlinePwKey, '$salt:${_hash(salt, pw)}');
  }

  Future<bool> verifyOfflinePassword(String pw) async {
    final stored = await read(_offlinePwKey);
    if (stored == null || stored.isEmpty) return false;

    final separator = stored.indexOf(':');
    // Legacy values were plaintext. Reject them rather than comparing: the
    // user simply signs in online once and a hash is written.
    if (separator <= 0) return false;

    final salt = stored.substring(0, separator);
    final expected = stored.substring(separator + 1);
    return _constantTimeEquals(_hash(salt, pw), expected);
  }

  Future<void> deleteOfflinePassword() => delete(_offlinePwKey);

  static String _newSalt() {
    final rng = Random.secure();
    final bytes = List<int>.generate(16, (_) => rng.nextInt(256));
    return base64Url.encode(bytes);
  }

  static String _hash(String salt, String pw) =>
      sha256.convert(utf8.encode('$salt$pw')).toString();

  /// Length-independent comparison to avoid leaking match position by timing.
  static bool _constantTimeEquals(String a, String b) {
    if (a.length != b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) {
      diff |= a.codeUnitAt(i) ^ b.codeUnitAt(i);
    }
    return diff == 0;
  }
}

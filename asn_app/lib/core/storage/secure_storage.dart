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

  Future<void> saveOfflinePassword(String pw) => write(_offlinePwKey, pw);
  Future<String?> getOfflinePassword() => read(_offlinePwKey);
  Future<void> deleteOfflinePassword() => delete(_offlinePwKey);
}

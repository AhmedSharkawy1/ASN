import 'dart:convert';
import 'package:asn_app/core/storage/secure_storage.dart';
import 'package:asn_app/core/storage/preferences.dart';
import 'package:asn_app/features/auth/data/models/user_model.dart';
import 'package:asn_app/core/logging/logger.dart';

abstract class AuthLocalDataSource {
  Future<void> saveAuthToken(String token);
  Future<String?> getAuthToken();
  Future<void> deleteAuthToken();

  Future<void> saveRefreshToken(String token);
  Future<String?> getRefreshToken();
  Future<void> deleteRefreshToken();

  /// Stores a salted hash for offline verification — never the password.
  Future<void> saveOfflinePasswordHash(String password);
  Future<bool> verifyOfflinePassword(String password);
  Future<void> deleteOfflinePassword();

  Future<void> cacheUserSession(UserModel user);
  Future<UserModel?> getCachedUserSession();
  Future<void> clearCachedUserSession();
}

class AuthLocalDataSourceImpl implements AuthLocalDataSource {
  final SecureStorage _secureStorage;
  final AppPreferences _preferences;

  AuthLocalDataSourceImpl(this._secureStorage, this._preferences);

  @override
  Future<void> saveAuthToken(String token) => _secureStorage.saveAuthToken(token);

  @override
  Future<String?> getAuthToken() => _secureStorage.getAuthToken();

  @override
  Future<void> deleteAuthToken() => _secureStorage.deleteAuthToken();

  @override
  Future<void> saveRefreshToken(String token) => _secureStorage.saveRefreshToken(token);

  @override
  Future<String?> getRefreshToken() => _secureStorage.getRefreshToken();

  @override
  Future<void> deleteRefreshToken() => _secureStorage.deleteRefreshToken();

  @override
  Future<void> saveOfflinePasswordHash(String password) =>
      _secureStorage.saveOfflinePasswordHash(password);

  @override
  Future<bool> verifyOfflinePassword(String password) =>
      _secureStorage.verifyOfflinePassword(password);

  @override
  Future<void> deleteOfflinePassword() => _secureStorage.deleteOfflinePassword();

  @override
  Future<void> cacheUserSession(UserModel user) async {
    try {
      final jsonString = json.encode(user.toJson());
      await _preferences.setOfflineSession(jsonString);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to cache user session locally', error: e, stackTrace: stackTrace, name: 'AuthLocal');
    }
  }

  @override
  Future<UserModel?> getCachedUserSession() async {
    try {
      final jsonString = _preferences.offlineSession;
      if (jsonString == null || jsonString.isEmpty) return null;
      
      final Map<String, dynamic> jsonMap = json.decode(jsonString) as Map<String, dynamic>;
      return UserModel.fromJson(jsonMap);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to read cached user session', error: e, stackTrace: stackTrace, name: 'AuthLocal');
      return null;
    }
  }

  @override
  Future<void> clearCachedUserSession() async {
    try {
      await _preferences.deleteOfflineSession();
    } catch (e, stackTrace) {
      AppLogger.error('Failed to clear cached user session', error: e, stackTrace: stackTrace, name: 'AuthLocal');
    }
  }
}

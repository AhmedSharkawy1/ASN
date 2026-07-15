import 'package:shared_preferences/shared_preferences.dart';
import 'package:asn_app/core/logging/logger.dart';

class AppPreferences {
  final SharedPreferences _prefs;

  AppPreferences(this._prefs);

  static const String _localeKey = 'locale_language';
  static const String _themeKey = 'theme_mode_setting';
  static const String _activeBranchKey = 'active_branch_cached';
  static const String _offlineSessionKey = 'offline_session_cached';

  // Locale
  String get locale => _prefs.getString(_localeKey) ?? 'ar';
  Future<bool> setLocale(String languageCode) async {
    try {
      return await _prefs.setString(_localeKey, languageCode);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to save locale preferences', error: e, stackTrace: stackTrace, name: 'Preferences');
      return false;
    }
  }

  // Theme
  String get themeMode => _prefs.getString(_themeKey) ?? 'system';
  Future<bool> setThemeMode(String themeValue) async {
    try {
      return await _prefs.setString(_themeKey, themeValue);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to save theme preferences', error: e, stackTrace: stackTrace, name: 'Preferences');
      return false;
    }
  }

  // Active Branch
  String get activeBranch => _prefs.getString(_activeBranchKey) ?? 'all';
  Future<bool> setActiveBranch(String branchId) async {
    try {
      return await _prefs.setString(_activeBranchKey, branchId);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to save active branch preference', error: e, stackTrace: stackTrace, name: 'Preferences');
      return false;
    }
  }

  // Offline Session
  String? get offlineSession => _prefs.getString(_offlineSessionKey);
  Future<bool> setOfflineSession(String jsonSession) async {
    try {
      return await _prefs.setString(_offlineSessionKey, jsonSession);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to save offline session preference', error: e, stackTrace: stackTrace, name: 'Preferences');
      return false;
    }
  }

  Future<bool> deleteOfflineSession() async {
    try {
      return await _prefs.remove(_offlineSessionKey);
    } catch (e, stackTrace) {
      AppLogger.error('Failed to delete offline session preference', error: e, stackTrace: stackTrace, name: 'Preferences');
      return false;
    }
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/storage/preferences.dart';

// Will be overridden in main/bootstrap with loaded SharedPreferences instance
final preferencesProvider = Provider<AppPreferences>((ref) => throw UnimplementedError());

class ThemeNotifier extends Notifier<ThemeMode> {
  @override
  ThemeMode build() {
    final prefs = ref.watch(preferencesProvider);
    final themeStr = prefs.themeMode;
    return _parseThemeMode(themeStr);
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    state = mode;
    final prefs = ref.read(preferencesProvider);
    await prefs.setThemeMode(mode.name);
  }

  ThemeMode _parseThemeMode(String themeStr) {
    switch (themeStr) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      case 'system':
      default:
        return ThemeMode.system;
    }
  }
}

final themeProvider = NotifierProvider<ThemeNotifier, ThemeMode>(() {
  return ThemeNotifier();
});

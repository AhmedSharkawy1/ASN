import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/theme/theme_provider.dart'; // sharing preferencesProvider

class LocaleNotifier extends Notifier<Locale> {
  @override
  Locale build() {
    final prefs = ref.watch(preferencesProvider);
    final lang = prefs.locale;
    return Locale(lang);
  }

  Future<void> setLocale(Locale locale) async {
    state = locale;
    final prefs = ref.read(preferencesProvider);
    await prefs.setLocale(locale.languageCode);
  }

  bool get isArabic => state.languageCode == 'ar';
}

final localeProvider = NotifierProvider<LocaleNotifier, Locale>(() {
  return LocaleNotifier();
});

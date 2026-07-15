import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';

import 'package:asn_app/core/theme/app_theme.dart';
import 'package:asn_app/core/theme/theme_provider.dart';
import 'package:asn_app/core/localization/locale_provider.dart';
import 'package:asn_app/core/router/app_router.dart';

class AsnApp extends ConsumerWidget {
  const AsnApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);
    final locale = ref.watch(localeProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'ASN Restaurant',
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      locale: locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('ar'), // Arabic (Default)
        Locale('en'), // English
      ],
      routerConfig: router,
    );
  }
}

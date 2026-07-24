import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';

import 'package:asn_app/core/theme/app_theme.dart';
import 'package:asn_app/core/theme/theme_provider.dart';
import 'package:asn_app/core/localization/locale_provider.dart';
import 'package:asn_app/core/router/app_router.dart';
import 'package:asn_app/core/services/order_notification_service.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/features/superadmin/presentation/providers/impersonation_provider.dart';

class AsnApp extends ConsumerStatefulWidget {
  const AsnApp({super.key});

  @override
  ConsumerState<AsnApp> createState() => _AsnAppState();
}

class _AsnAppState extends ConsumerState<AsnApp> {
  @override
  void initState() {
    super.initState();
    // If the app was cold-launched by tapping an order notification (or its
    // "call customer" action), replay that action once everything is ready.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(orderNotificationServiceProvider).handleLaunchAction();
    });
  }

  bool _impersonationRestored = false;

  @override
  Widget build(BuildContext context) {
    final themeMode = ref.watch(themeProvider);
    final locale = ref.watch(localeProvider);
    final router = ref.watch(routerProvider);

    // Once signed in, re-enter the restaurant a super admin was last inside.
    ref.listen<AuthState>(authNotifierProvider, (previous, next) {
      next.maybeWhen(
        authenticated: (_) {
          if (_impersonationRestored) return;
          _impersonationRestored = true;
          ref.read(impersonationProvider.notifier).restore();
        },
        orElse: () => _impersonationRestored = false,
      );
    });

    // Let notification taps deep-link into the app (e.g. open /orders).
    OrderNotificationService.navigateTo = router.go;

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

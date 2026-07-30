import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';

import 'package:asn_app/core/theme/app_theme.dart';
import 'package:asn_app/core/theme/theme_provider.dart';
import 'package:asn_app/core/localization/locale_provider.dart';
import 'package:asn_app/core/router/app_router.dart';
import 'package:asn_app/core/services/background_order_service.dart';
import 'package:asn_app/core/services/order_notification_service.dart';
import 'package:asn_app/core/services/session_sync.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';
import 'package:asn_app/features/superadmin/presentation/providers/impersonation_provider.dart';

class AsnApp extends ConsumerStatefulWidget {
  const AsnApp({super.key});

  @override
  ConsumerState<AsnApp> createState() => _AsnAppState();
}

class _AsnAppState extends ConsumerState<AsnApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    // The background service must know the UI is up, or it will chime for an
    // order the in-app listener is already alerting.
    BackgroundOrderService.setAppForeground(true);
    SessionSync.adoptStoredSessionIfStale();
    // If the app was cold-launched by tapping an order notification (or its
    // "call customer" action), replay that action once everything is ready.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(orderNotificationServiceProvider).handleLaunchAction();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // `resumed` is the only state where the in-app listener is guaranteed to be
    // running and visible; anything else hands the alert back to the service.
    final resumed = state == AppLifecycleState.resumed;
    BackgroundOrderService.setAppForeground(resumed);
    // Coming back to the front is usually a notification tap doing it, and a
    // tap on an alert the background service posted was recorded there rather
    // than acted on.
    if (resumed) {
      ref.read(orderNotificationServiceProvider).consumePendingTap();
      // While the app was away the background service may have rotated the
      // session forward; adopt it rather than refreshing onto a revoked token.
      SessionSync.adoptStoredSessionIfStale();
    }
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
      title: 'ASN Menu',
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

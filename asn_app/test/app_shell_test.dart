import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/features/permissions/presentation/providers/permissions_provider.dart';
import 'package:asn_app/shared/presentation/widgets/app_shell.dart';

/// Grants the five top-level module permissions without needing a real
/// auth session, so the shell's destination filtering can be verified.
class _TestPermissions extends PermissionsNotifier {
  @override
  Map<String, bool> build() => const {
        'pos': true,
        'orders': true,
        'kitchen': true,
        'products': true,
        'reports': true,
      };
}

Widget _host(String location) {
  return ProviderScope(
    overrides: [permissionsProvider.overrideWith(_TestPermissions.new)],
    child: MaterialApp(
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,
      locale: const Locale('en'),
      home: AppShell(location: location, child: const Placeholder()),
    ),
  );
}

void _setSize(WidgetTester tester, Size size) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('phone width shows a single bottom NavigationBar (no rail)', (tester) async {
    _setSize(tester, const Size(400, 800));
    await tester.pumpWidget(_host('/dashboard'));
    await tester.pumpAndSettle();

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);

    // Dashboard + the 4 permitted destinations that fit (capped at 5).
    final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    expect(navBar.destinations.length, 5);
  });

  testWidgets('tablet width shows a NavigationRail (no bottom bar)', (tester) async {
    _setSize(tester, const Size(1100, 800));
    await tester.pumpWidget(_host('/dashboard'));
    await tester.pumpAndSettle();

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);

    final rail = tester.widget<NavigationRail>(find.byType(NavigationRail));
    expect(rail.destinations.length, 5);
  });

  testWidgets('non-tab route renders child with no nav chrome', (tester) async {
    _setSize(tester, const Size(400, 800));
    await tester.pumpWidget(_host('/inventory'));
    await tester.pumpAndSettle();

    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(NavigationRail), findsNothing);
    expect(find.byType(Placeholder), findsOneWidget);
  });

  testWidgets('selected index tracks the current location', (tester) async {
    _setSize(tester, const Size(400, 800));
    await tester.pumpWidget(_host('/orders'));
    await tester.pumpAndSettle();

    final navBar = tester.widget<NavigationBar>(find.byType(NavigationBar));
    // Order of destinations: dashboard(0), pos(1), orders(2), kitchen(3), products(4)
    expect(navBar.selectedIndex, 2);
  });
}

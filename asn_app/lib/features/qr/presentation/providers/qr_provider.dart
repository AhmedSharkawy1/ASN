import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/config/app_config.dart';
import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/features/auth/presentation/providers/auth_provider.dart';

/// Restaurant identity needed to build customer-menu QR URLs, matching the
/// web dashboard's /dashboard/qr logic exactly:
///  - with a slug:  https://{slug}.asntechnology.net        (+ ?table=)
///  - without slug: {apiBase}/menu/{restaurantId}           (+ ?table=)
class QrInfo {
  final String restaurantId;
  final String? slug;

  const QrInfo({required this.restaurantId, this.slug});

  /// The menu link a QR code encodes.
  ///
  /// [tableLabel] is what a human reads — it is what the waiter-call alert
  /// names, so "ترابيزة 5" rather than a UUID. The id rides along separately so
  /// the link still identifies the row exactly.
  String menuUrl({String? tableId, String? tableLabel}) {
    final String base;
    // No label to show: fall back to the id, so the alert can still say which
    // table it was rather than nothing at all.
    final shown = (tableLabel?.trim().isNotEmpty ?? false)
        ? tableLabel!.trim()
        : tableId;
    final params = <String, String>{
      'table': ?shown,
      'table_id': ?tableId,
    };
    final query = params.isEmpty
        ? ''
        : '?${params.entries.map((e) => '${e.key}=${Uri.encodeQueryComponent(e.value)}').join('&')}';
    if (slug != null && slug!.isNotEmpty) {
      base = 'https://$slug.asntechnology.net';
      return '$base$query';
    }
    base = '${AppConfig.apiBaseUrl}/menu/$restaurantId';
    return '$base$query';
  }
}

class QrInfoNotifier extends Notifier<AsyncValue<QrInfo>> {
  @override
  AsyncValue<QrInfo> build() {
    // Rebuild (and refetch) whenever the active restaurant changes.
    ref.watch(activeRestaurantIdProvider);
    _fetch();
    return const AsyncValue.loading();
  }

  Future<void> _fetch() async {
    final authState = ref.read(authNotifierProvider);
    final restaurantId = authState.maybeWhen(
      authenticated: (user) => user.restaurantId,
      orElse: () => null,
    );

    if (restaurantId == null) {
      state = AsyncValue.error('No restaurant', StackTrace.current);
      return;
    }

    try {
      final row = await SupabaseClientManager.client
          .from('restaurants')
          .select('slug')
          .eq('id', restaurantId)
          .maybeSingle();

      state = AsyncValue.data(QrInfo(
        restaurantId: restaurantId,
        slug: row?['slug'] as String?,
      ));
    } catch (e, st) {
      AppLogger.error('Failed to load QR info', error: e, stackTrace: st, name: 'QrProvider');
      // Slug is optional — fall back to the id-based URL rather than failing.
      state = AsyncValue.data(QrInfo(restaurantId: restaurantId));
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetch();
  }
}

final qrInfoProvider = NotifierProvider<QrInfoNotifier, AsyncValue<QrInfo>>(() {
  return QrInfoNotifier();
});

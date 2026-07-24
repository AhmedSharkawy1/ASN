import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:asn_app/core/logging/logger.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/data/supabase_client.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/glass_container.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/superadmin/presentation/providers/impersonation_provider.dart';

class RestaurantSummary {
  final String id;
  final String name;
  final String? email;
  final String? slug;
  final bool isActive;

  const RestaurantSummary({
    required this.id,
    required this.name,
    this.email,
    this.slug,
    this.isActive = true,
  });

  factory RestaurantSummary.fromJson(Map<String, dynamic> json) {
    return RestaurantSummary(
      id: json['id'] as String,
      name: (json['name'] as String?)?.trim().isNotEmpty == true
          ? (json['name'] as String).trim()
          : '—',
      email: json['email'] as String?,
      slug: json['slug'] as String?,
      isActive: json['is_active'] as bool? ?? true,
    );
  }
}

class RestaurantsNotifier extends Notifier<AsyncValue<List<RestaurantSummary>>> {
  @override
  AsyncValue<List<RestaurantSummary>> build() {
    _fetch();
    return const AsyncValue.loading();
  }

  Future<void> _fetch() async {
    try {
      final response = await SupabaseClientManager.client
          .from('restaurants')
          .select('id, name, email, slug')
          .order('name', ascending: true);

      state = AsyncValue.data((response as List)
          .map((j) => RestaurantSummary.fromJson(j as Map<String, dynamic>))
          .toList());
    } catch (e, st) {
      AppLogger.error('Failed to load restaurants', error: e, stackTrace: st, name: 'SuperAdmin');
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    await _fetch();
  }
}

final restaurantsProvider =
    NotifierProvider<RestaurantsNotifier, AsyncValue<List<RestaurantSummary>>>(() {
  return RestaurantsNotifier();
});

/// Super-admin console: browse every restaurant, enter one to manage it, and
/// switch or leave at any time.
class SuperAdminScreen extends ConsumerStatefulWidget {
  const SuperAdminScreen({super.key});

  @override
  ConsumerState<SuperAdminScreen> createState() => _SuperAdminScreenState();
}

class _SuperAdminScreenState extends ConsumerState<SuperAdminScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final asyncRestaurants = ref.watch(restaurantsProvider);
    final current = ref.watch(impersonationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('كل المطاعم'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(restaurantsProvider.notifier).refresh(),
          ),
        ],
      ),
      body: Column(
        children: [
          if (current != null) _ActiveBanner(impersonation: current),
          Padding(
            padding: const EdgeInsets.fromLTRB(
                AppSpacing.md, AppSpacing.sm, AppSpacing.md, AppSpacing.xs),
            child: TextField(
              onChanged: (v) => setState(() => _query = v),
              decoration: InputDecoration(
                hintText: 'ابحث عن مطعم...',
                prefixIcon: const Icon(Icons.search, size: 22),
                isDense: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
                ),
              ),
            ),
          ),
          Expanded(
            child: asyncRestaurants.when(
              data: (restaurants) {
                var list = restaurants;
                if (_query.trim().isNotEmpty) {
                  final q = _query.toLowerCase();
                  list = list
                      .where((r) =>
                          r.name.toLowerCase().contains(q) ||
                          (r.email?.toLowerCase().contains(q) ?? false) ||
                          (r.slug?.toLowerCase().contains(q) ?? false))
                      .toList();
                }

                if (list.isEmpty) {
                  return const AppEmptyState(
                    icon: Icons.storefront_outlined,
                    message: 'لا توجد مطاعم',
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(restaurantsProvider.notifier).refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(
                        AppSpacing.md, 0, AppSpacing.md, AppSpacing.xl),
                    itemCount: list.length,
                    separatorBuilder: (context, index) => AppSpacing.heightXs,
                    itemBuilder: (context, index) => _RestaurantTile(
                      restaurant: list[index],
                      isCurrent: current?.restaurantId == list[index].id,
                    ),
                  ),
                );
              },
              loading: () => const AppListSkeleton(),
              error: (err, stack) => AppErrorState(
                error: err,
                onRetry: () => ref.read(restaurantsProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveBanner extends ConsumerWidget {
  final Impersonation impersonation;

  const _ActiveBanner({required this.impersonation});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 0),
      child: GlassContainer.flat(
        padding: const EdgeInsets.all(AppSpacing.sm),
        tint: AppColors.steelBlue.withValues(alpha: 0.12),
        child: Row(
          children: [
            const Icon(Icons.storefront, color: AppColors.steelBlue, size: 20),
            AppSpacing.widthSm,
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('أنت داخل حالياً',
                      style: TextStyle(fontSize: 11, color: Colors.grey)),
                  Text(
                    impersonation.restaurantName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                ],
              ),
            ),
            TextButton.icon(
              onPressed: () async {
                await ref.read(impersonationProvider.notifier).exit();
                if (context.mounted) {
                  showAppSnackBar(context, 'تم الخروج من المطعم',
                      type: AppSnackBarType.info);
                }
              },
              icon: const Icon(Icons.logout, size: 16),
              label: const Text('خروج'),
              style: TextButton.styleFrom(foregroundColor: AppColors.error),
            ),
          ],
        ),
      ),
    );
  }
}

class _RestaurantTile extends ConsumerWidget {
  final RestaurantSummary restaurant;
  final bool isCurrent;

  const _RestaurantTile({required this.restaurant, required this.isCurrent});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return GlassContainer.flat(
      padding: const EdgeInsets.all(AppSpacing.sm),
      tint: isCurrent ? AppColors.steelBlue.withValues(alpha: 0.10) : null,
      child: Row(
        children: [
          CircleAvatar(
            radius: 20,
            backgroundColor: AppColors.steelBlue.withValues(alpha: 0.14),
            child: Text(
              restaurant.name.characters.take(1).toString().toUpperCase(),
              style: const TextStyle(
                color: AppColors.steelBlue,
                fontWeight: FontWeight.w600,
                fontSize: 16,
              ),
            ),
          ),
          AppSpacing.widthSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  restaurant.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                if (restaurant.slug?.isNotEmpty == true ||
                    restaurant.email?.isNotEmpty == true)
                  Text(
                    restaurant.slug?.isNotEmpty == true
                        ? restaurant.slug!
                        : restaurant.email!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.labelSmall,
                  ),
              ],
            ),
          ),
          AppSpacing.widthXs,
          if (isCurrent)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: AppSpacing.xs),
              child: Icon(Icons.check_circle, color: AppColors.success, size: 22),
            )
          else
            FilledButton.tonal(
              onPressed: () async {
                await ref
                    .read(impersonationProvider.notifier)
                    .enter(restaurant.id, restaurant.name);
                if (!context.mounted) return;
                showAppSnackBar(context, 'تم الدخول على ${restaurant.name}',
                    type: AppSnackBarType.success);
                context.go('/dashboard');
              },
              style: FilledButton.styleFrom(
                minimumSize: const Size(72, 40),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
              ),
              child: const Text('دخول'),
            ),
        ],
      ),
    );
  }
}

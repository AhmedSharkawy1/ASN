import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_search_field.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/products/presentation/providers/products_provider.dart';
import 'package:asn_app/features/products/presentation/providers/categories_provider.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/products/presentation/widgets/product_edit_sheet.dart';
import 'package:asn_app/features/products/presentation/widgets/category_manager_sheet.dart';
import 'package:asn_app/features/products/presentation/widgets/reorder_items_sheet.dart';

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key});

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  String _searchQuery = '';
  String? _selectedCategoryId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final productsAsync = ref.watch(productsNotifierProvider);
    final categoriesAsync = ref.watch(categoriesNotifierProvider);
    final categories = categoriesAsync.value ?? const [];

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.products),
        actions: [
          if (_selectedCategoryId != null)
            IconButton(
              tooltip: l10n.sortItems,
              icon: const Icon(Icons.swap_vert),
              onPressed: () {
                final products = ref.read(productsNotifierProvider).value ?? const [];
                final categoryProducts =
                    products.where((p) => p.categoryId == _selectedCategoryId).toList();
                if (categoryProducts.isNotEmpty) {
                  showReorderItemsSheet(context, categoryProducts);
                }
              },
            ),
          IconButton(
            tooltip: l10n.manageCategories,
            icon: const Icon(Icons.category_outlined),
            onPressed: () => showCategoryManagerSheet(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.read(productsNotifierProvider.notifier).refresh();
              ref.read(categoriesNotifierProvider.notifier).refresh();
            },
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: Column(
        children: [
          AppSearchField(onChanged: (value) => setState(() => _searchQuery = value)),
          // Category filter chips
          SizedBox(
            height: 52,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.xs),
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: AppSpacing.xs),
                  child: ChoiceChip(
                    label: Text(l10n.allCategories),
                    selected: _selectedCategoryId == null,
                    selectedColor: AppColors.tealPrimary.withValues(alpha: 0.15),
                    onSelected: (_) => setState(() => _selectedCategoryId = null),
                  ),
                ),
                ...categories.map(
                  (cat) => Padding(
                    padding: const EdgeInsetsDirectional.only(end: AppSpacing.xs),
                    child: ChoiceChip(
                      label: Text(
                        '${cat.emoji ?? ''} ${cat.localizedName(isArabic)}'.trim(),
                      ),
                      selected: _selectedCategoryId == cat.id,
                      selectedColor: AppColors.tealPrimary.withValues(alpha: 0.15),
                      onSelected: (_) => setState(() => _selectedCategoryId = cat.id),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: productsAsync.when(
              data: (products) {
                var filtered = products;
                if (_selectedCategoryId != null) {
                  filtered = filtered.where((p) => p.categoryId == _selectedCategoryId).toList();
                }
                if (_searchQuery.isNotEmpty) {
                  final q = _searchQuery.toLowerCase();
                  filtered = filtered
                      .where((p) =>
                          p.titleAr.toLowerCase().contains(q) ||
                          (p.titleEn?.toLowerCase().contains(q) ?? false))
                      .toList();
                }

                if (filtered.isEmpty) {
                  return AppEmptyState(icon: Icons.restaurant_menu, message: l10n.noProducts);
                }

                return RefreshIndicator(
                  onRefresh: () async {
                    await ref.read(productsNotifierProvider.notifier).refresh();
                    await ref.read(categoriesNotifierProvider.notifier).refresh();
                  },
                  child: GridView.builder(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 220,
                      childAspectRatio: 0.72,
                      crossAxisSpacing: AppSpacing.md,
                      mainAxisSpacing: AppSpacing.md,
                    ),
                    itemCount: filtered.length,
                    itemBuilder: (context, index) => _ProductCard(product: filtered[index]),
                  ),
                );
              },
              loading: () => const AppListSkeleton(itemHeight: 180),
              error: (err, stack) => AppErrorState(
                error: err,
                onRetry: () => ref.read(productsNotifierProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          if (categories.isEmpty) {
            showAppSnackBar(context, l10n.addCategory, type: AppSnackBarType.info);
            showCategoryManagerSheet(context);
            return;
          }
          showProductEditSheet(context, initialCategoryId: _selectedCategoryId);
        },
        backgroundColor: AppColors.tealPrimary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text(l10n.addProduct, style: const TextStyle(color: Colors.white)),
      ),
    );
  }
}

class _ProductCard extends ConsumerWidget {
  final ProductModel product;

  const _ProductCard({required this.product});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final firstSize = product.sizes.first;

    return GestureDetector(
      onTap: () => showProductEditSheet(context, product: product),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          boxShadow: AppColors.shadowOf(context),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (product.imageUrl != null && product.imageUrl!.isNotEmpty)
                    CachedNetworkImage(
                      imageUrl: product.imageUrl!,
                      fit: BoxFit.cover,
                      placeholder: (context, url) => Container(
                        color: Colors.grey.withValues(alpha: 0.15),
                      ),
                      errorWidget: (context, url, error) => Container(
                        color: Colors.grey.withValues(alpha: 0.15),
                        child: const Icon(Icons.fastfood, size: 40, color: Colors.grey),
                      ),
                    )
                  else
                    Container(
                      color: Colors.grey.withValues(alpha: 0.15),
                      child: const Icon(Icons.fastfood, size: 40, color: Colors.grey),
                    ),
                  // Price badge (with discount strikethrough when present)
                  PositionedDirectional(
                    top: 8,
                    end: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (firstSize.hasDiscount) ...[
                            Text(
                              _fmt(firstSize.oldPrice!),
                              style: const TextStyle(
                                fontSize: 11,
                                color: Colors.grey,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                            const SizedBox(width: 4),
                          ],
                          Text(
                            product.hasMultipleSizes
                                ? '${l10n.priceFrom} ${_fmt(product.minPrice)}'
                                : _fmt(firstSize.price),
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              color: AppColors.tealPrimary,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Badges: popular / spicy
                  PositionedDirectional(
                    top: 8,
                    start: 8,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (product.isPopular)
                          _Badge(icon: Icons.star, color: AppColors.warning, label: l10n.popular),
                        if (product.isSpicy)
                          Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: _Badge(
                              icon: Icons.local_fire_department,
                              color: AppColors.error,
                              label: l10n.spicy,
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.titleAr,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        if (product.titleEn?.isNotEmpty == true && product.titleEn != product.titleAr)
                          Text(
                            product.titleEn!,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                          ),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            product.isAvailable ? l10n.available : l10n.outOfStock,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: product.isAvailable ? AppColors.success : AppColors.error,
                            ),
                          ),
                        ),
                        Switch(
                          value: product.isAvailable,
                          activeThumbColor: AppColors.tealPrimary,
                          onChanged: (value) async {
                            try {
                              await ref
                                  .read(productsNotifierProvider.notifier)
                                  .toggleAvailability(product.id, product.isAvailable);
                            } catch (e) {
                              if (context.mounted) {
                                showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                              }
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _fmt(double v) =>
      v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);
}

class _Badge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final String label;

  const _Badge({required this.icon, required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.9),
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 11, color: Colors.white),
          const SizedBox(width: 3),
          Text(
            label,
            style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

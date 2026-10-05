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
import 'package:asn_app/features/products/data/models/category_model.dart';
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
  final Set<String> _collapsedCategoryIds = {};

  void _toggleCollapse(String categoryId) {
    setState(() {
      if (_collapsedCategoryIds.contains(categoryId)) {
        _collapsedCategoryIds.remove(categoryId);
      } else {
        _collapsedCategoryIds.add(categoryId);
      }
    });
  }

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
            tooltip: isArabic ? 'تحديث' : 'Refresh',
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
              data: (allProducts) {
                if (categories.isEmpty && allProducts.isEmpty) {
                  return AppEmptyState(icon: Icons.restaurant_menu, message: l10n.noProducts);
                }

                var displayCats = categories;
                if (_selectedCategoryId != null) {
                  displayCats = displayCats.where((c) => c.id == _selectedCategoryId).toList();
                }

                final q = _searchQuery.trim().toLowerCase();

                return RefreshIndicator(
                  onRefresh: () async {
                    await ref.read(productsNotifierProvider.notifier).refresh();
                    await ref.read(categoriesNotifierProvider.notifier).refresh();
                  },
                  child: ListView.builder(
                    padding: const EdgeInsets.only(
                      left: AppSpacing.md,
                      right: AppSpacing.md,
                      top: AppSpacing.sm,
                      bottom: 80,
                    ),
                    itemCount: displayCats.length + 1,
                    itemBuilder: (context, catIdx) {
                      if (catIdx == displayCats.length) {
                        final knownCatIds = categories.map((c) => c.id).toSet();
                        var uncatItems = allProducts
                            .where((p) => p.categoryId == null || !knownCatIds.contains(p.categoryId))
                            .toList();
                        if (q.isNotEmpty) {
                          uncatItems = uncatItems
                              .where((p) =>
                                  p.titleAr.toLowerCase().contains(q) ||
                                  (p.titleEn?.toLowerCase().contains(q) ?? false) ||
                                  (p.descAr?.toLowerCase().contains(q) ?? false))
                              .toList();
                        }
                        if (uncatItems.isEmpty) return const SizedBox.shrink();
                        return _UncategorizedSection(items: uncatItems, isArabic: isArabic);
                      }

                      final cat = displayCats[catIdx];
                      var catItems = allProducts.where((p) => p.categoryId == cat.id).toList();

                      if (q.isNotEmpty) {
                        final catNameMatches = cat.nameAr.toLowerCase().contains(q) ||
                            (cat.nameEn?.toLowerCase().contains(q) ?? false);
                        if (!catNameMatches) {
                          catItems = catItems
                              .where((p) =>
                                  p.titleAr.toLowerCase().contains(q) ||
                                  (p.titleEn?.toLowerCase().contains(q) ?? false) ||
                                  (p.descAr?.toLowerCase().contains(q) ?? false))
                              .toList();
                          if (catItems.isEmpty) return const SizedBox.shrink();
                        }
                      }

                      final isCollapsed = _collapsedCategoryIds.contains(cat.id);
                      final isFirst = catIdx == 0;
                      final isLast = catIdx == displayCats.length - 1;

                      return _CategoryCard(
                        key: ValueKey(cat.id),
                        category: cat,
                        items: catItems,
                        catIndex: catIdx,
                        isFirst: isFirst,
                        isLast: isLast,
                        isCollapsed: isCollapsed,
                        isArabic: isArabic,
                        onToggleCollapse: () => _toggleCollapse(cat.id),
                        onAddProductToCat: () {
                          showProductEditSheet(context, initialCategoryId: cat.id);
                        },
                      );
                    },
                  ),
                );
              },
              loading: () => const AppListSkeleton(itemHeight: 180),
              error: (err, stack) => AppErrorState(
                error: err,
                onRetry: () {
                  ref.read(productsNotifierProvider.notifier).refresh();
                  ref.read(categoriesNotifierProvider.notifier).refresh();
                },
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          if (categories.isEmpty) {
            showAppSnackBar(context, l10n.addCategory, type: AppSnackBarType.info);
            showCategoryEditDialog(context, ref);
            return;
          }
          showProductEditSheet(context, initialCategoryId: _selectedCategoryId);
        },
        backgroundColor: AppColors.tealPrimary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text(l10n.addProduct, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}

// ============================================================================
// CATEGORY CARD WITH ACCORDION & ACTIONS
// ============================================================================
class _CategoryCard extends ConsumerWidget {
  final CategoryModel category;
  final List<ProductModel> items;
  final int catIndex;
  final bool isFirst;
  final bool isLast;
  final bool isCollapsed;
  final bool isArabic;
  final VoidCallback onToggleCollapse;
  final VoidCallback onAddProductToCat;

  const _CategoryCard({
    super.key,
    required this.category,
    required this.items,
    required this.catIndex,
    required this.isFirst,
    required this.isLast,
    required this.isCollapsed,
    required this.isArabic,
    required this.onToggleCollapse,
    required this.onAddProductToCat,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final isCatHidden = !category.isAvailable;
    final isCatFeatured = category.isPopular || (items.isNotEmpty && items.every((i) => i.isPopular));

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        side: BorderSide(
          color: isCatHidden
              ? AppColors.error.withValues(alpha: 0.3)
              : Theme.of(context).dividerColor.withValues(alpha: 0.15),
          width: 1.2,
        ),
      ),
      elevation: 0,
      color: Theme.of(context).cardColor,
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // CATEGORY HEADER
          InkWell(
            onTap: onToggleCollapse,
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: isCatHidden
                    ? AppColors.error.withValues(alpha: 0.05)
                    : Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                border: Border(
                  bottom: BorderSide(
                    color: Theme.of(context).dividerColor.withValues(alpha: 0.1),
                    width: 1,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Category Image / Emoji Avatar
                      GestureDetector(
                        onTap: () => pickAndUploadCategoryImage(context, ref, category),
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: AppColors.tealPrimary.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child: category.imageUrl?.isNotEmpty == true
                              ? CachedNetworkImage(
                                  imageUrl: category.imageUrl!,
                                  fit: BoxFit.cover,
                                  placeholder: (context, url) => const Center(
                                    child: SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    ),
                                  ),
                                  errorWidget: (context, url, error) => Center(
                                    child: Text(category.emoji ?? '🍽️', style: const TextStyle(fontSize: 22)),
                                  ),
                                )
                              : Center(
                                  child: Text(
                                    category.emoji?.isNotEmpty == true ? category.emoji! : '🍽️',
                                    style: const TextStyle(fontSize: 22),
                                  ),
                                ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      // Title & Badges
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    category.nameAr,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '(${items.length})',
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                            if (category.nameEn?.isNotEmpty == true && category.nameEn != category.nameAr)
                              Text(
                                category.nameEn!,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            const SizedBox(height: 4),
                            // Category Status Badges
                            Wrap(
                              spacing: 6,
                              runSpacing: 4,
                              children: [
                                if (isCatHidden)
                                  _StatusChip(
                                    icon: Icons.visibility_off,
                                    label: isArabic ? 'مخفي بالكامل' : 'Hidden',
                                    color: AppColors.error,
                                  ),
                                if (isCatFeatured)
                                  _StatusChip(
                                    icon: Icons.star,
                                    label: isArabic ? 'قسم مميز' : 'Featured',
                                    color: AppColors.warning,
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      // Chevron expand/collapse
                      Icon(
                        isCollapsed ? Icons.keyboard_arrow_down : Icons.keyboard_arrow_up,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  // Category Action Toolbar
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Move Up/Down Controls
                      Container(
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            IconButton(
                              icon: const Icon(Icons.keyboard_arrow_up, size: 20),
                              padding: const EdgeInsets.all(4),
                              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                              tooltip: isArabic ? 'نقل لأعلى' : 'Move Up',
                              onPressed: isFirst
                                  ? null
                                  : () => ref
                                      .read(categoriesNotifierProvider.notifier)
                                      .moveCategory(catIndex, 'up'),
                            ),
                            IconButton(
                              icon: const Icon(Icons.keyboard_arrow_down, size: 20),
                              padding: const EdgeInsets.all(4),
                              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                              tooltip: isArabic ? 'نقل لأسفل' : 'Move Down',
                              onPressed: isLast
                                  ? null
                                  : () => ref
                                      .read(categoriesNotifierProvider.notifier)
                                      .moveCategory(catIndex, 'down'),
                            ),
                          ],
                        ),
                      ),
                      // Quick Action Buttons
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: Icon(
                              isCatFeatured ? Icons.star : Icons.star_border,
                              color: isCatFeatured ? AppColors.warning : Colors.grey,
                              size: 22,
                            ),
                            padding: const EdgeInsets.all(6),
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                            tooltip: isArabic
                                ? (isCatFeatured ? 'إلغاء تمييز القسم' : 'تمييز كل أصناف القسم')
                                : (isCatFeatured ? 'Unfeature category' : 'Feature category'),
                            onPressed: () => ref
                                .read(categoriesNotifierProvider.notifier)
                                .toggleCategoryFeatured(category.id, category.isPopular),
                          ),
                          IconButton(
                            icon: Icon(
                              isCatHidden ? Icons.visibility_off : Icons.visibility,
                              color: isCatHidden ? AppColors.error : AppColors.success,
                              size: 22,
                            ),
                            padding: const EdgeInsets.all(6),
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                            tooltip: isArabic
                                ? (isCatHidden ? 'إظهار القسم' : 'إخفاء القسم')
                                : (isCatHidden ? 'Show category' : 'Hide category'),
                            onPressed: () => ref
                                .read(categoriesNotifierProvider.notifier)
                                .toggleCategoryAvailability(category.id, category.isAvailable),
                          ),
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 20, color: AppColors.tealPrimary),
                            padding: const EdgeInsets.all(6),
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                            tooltip: l10n.edit,
                            onPressed: () => showCategoryEditDialog(context, ref, category: category),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.error),
                            padding: const EdgeInsets.all(6),
                            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                            tooltip: l10n.delete,
                            onPressed: () async {
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: Text(isArabic ? 'حذف القسم' : 'Delete Category'),
                                  content: Text(
                                    isArabic
                                        ? 'هل أنت متأكد من حذف قسم "${category.nameAr}" وجميع الأصناف التابعة له؟'
                                        : 'Are you sure you want to delete category "${category.nameAr}" and all its items?',
                                  ),
                                  actions: [
                                    TextButton(
                                      onPressed: () => Navigator.pop(ctx, false),
                                      child: Text(l10n.cancel),
                                    ),
                                    TextButton(
                                      style: TextButton.styleFrom(foregroundColor: AppColors.error),
                                      onPressed: () => Navigator.pop(ctx, true),
                                      child: Text(l10n.delete),
                                    ),
                                  ],
                                ),
                              );
                              if (confirmed != true) return;
                              try {
                                await ref
                                    .read(categoriesNotifierProvider.notifier)
                                    .deleteCategory(category.id);
                                await ref.read(productsNotifierProvider.notifier).refresh();
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
                ],
              ),
            ),
          ),

          // EXPANDED BODY (ITEMS BOXES GRID)
          if (!isCollapsed) ...[
            if (isCatHidden)
              Container(
                margin: const EdgeInsets.all(AppSpacing.sm),
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  border: Border.all(color: AppColors.error.withValues(alpha: 0.25)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.visibility_off, color: AppColors.error, size: 18),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        isArabic
                            ? 'تنبيه: هذا القسم وجميع أصنافه مخفية حالياً ولا تظهر للعملاء في المنيو.'
                            : 'Notice: This category and all its items are hidden from the menu.',
                        style: const TextStyle(fontSize: 12, color: AppColors.error, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),

            if (items.isEmpty)
              Padding(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Center(
                  child: Text(
                    isArabic ? 'لا توجد أصناف بعد في هذا القسم.' : 'No items yet in this category.',
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                  ),
                ),
              )
            else
              // Product Boxes Grid System
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                padding: const EdgeInsets.all(AppSpacing.sm),
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 220,
                  mainAxisSpacing: 10,
                  crossAxisSpacing: 10,
                  childAspectRatio: 0.60,
                ),
                itemCount: items.length,
                itemBuilder: (context, itemIdx) {
                  final item = items[itemIdx];
                  return _ProductBoxCard(
                    key: ValueKey(item.id),
                    product: item,
                    categoryId: category.id,
                    itemIndex: itemIdx,
                    isFirst: itemIdx == 0,
                    isLast: itemIdx == items.length - 1,
                    isArabic: isArabic,
                  );
                },
              ),

            // Add Item button at bottom of category
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  side: BorderSide(
                    color: AppColors.tealPrimary.withValues(alpha: 0.4),
                    style: BorderStyle.solid,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                ),
                onPressed: onAddProductToCat,
                icon: const Icon(Icons.add, size: 18, color: AppColors.tealPrimary),
                label: Text(
                  isArabic ? 'إضافة صنف جديد لهذا القسم' : 'Add New Item to this Category',
                  style: const TextStyle(
                    color: AppColors.tealPrimary,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.xs),
          ],
        ],
      ),
    );
  }
}

// ============================================================================
// UNCATEGORIZED ITEMS SECTION (FALLBACK FOR ORPHAN ITEMS)
// ============================================================================
class _UncategorizedSection extends ConsumerWidget {
  final List<ProductModel> items;
  final bool isArabic;

  const _UncategorizedSection({required this.items, required this.isArabic});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        side: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: 0.2)),
      ),
      elevation: 0,
      color: Theme.of(context).cardColor,
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
            child: Row(
              children: [
                const Icon(Icons.folder_open, color: Colors.grey),
                const SizedBox(width: AppSpacing.sm),
                Text(
                  isArabic ? 'أصناف غير مصنفة' : 'Uncategorized Items',
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(width: 6),
                Text('(${items.length})', style: const TextStyle(fontSize: 13, color: Colors.grey)),
              ],
            ),
          ),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: const EdgeInsets.all(AppSpacing.sm),
            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
              maxCrossAxisExtent: 220,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.60,
            ),
            itemCount: items.length,
            itemBuilder: (context, itemIdx) {
              final item = items[itemIdx];
              return _ProductBoxCard(
                key: ValueKey(item.id),
                product: item,
                categoryId: item.categoryId ?? '',
                itemIndex: itemIdx,
                isFirst: itemIdx == 0,
                isLast: itemIdx == items.length - 1,
                isArabic: isArabic,
              );
            },
          ),
        ],
      ),
    );
  }
}

// ============================================================================
// PRODUCT BOX CARD (نظام البوكسات مع كامل أزرار وإمكانيات التعديل)
// ============================================================================
class _ProductBoxCard extends ConsumerWidget {
  final ProductModel product;
  final String categoryId;
  final int itemIndex;
  final bool isFirst;
  final bool isLast;
  final bool isArabic;

  const _ProductBoxCard({
    super.key,
    required this.product,
    required this.categoryId,
    required this.itemIndex,
    required this.isFirst,
    required this.isLast,
    required this.isArabic,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final isHidden = !product.isAvailable;
    final firstSize = product.sizes.isNotEmpty
        ? product.sizes.first
        : const ProductSize(label: '', price: 0);

    return Container(
      decoration: BoxDecoration(
        color: isHidden
            ? AppColors.error.withValues(alpha: 0.04)
            : Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(
          color: isHidden
              ? AppColors.error.withValues(alpha: 0.35)
              : Theme.of(context).dividerColor.withValues(alpha: 0.18),
          width: 1.1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // TOP: Product Image & Badges & Price Tag (Tappable to Edit)
          GestureDetector(
            onTap: () => showProductEditSheet(context, product: product),
            child: SizedBox(
              height: 110,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  // Image
                  (product.imageUrl?.isNotEmpty == true || product.thumbnailUrl?.isNotEmpty == true)
                      ? CachedNetworkImage(
                          imageUrl: product.thumbnailUrl ?? product.imageUrl!,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(
                            color: Colors.grey.withValues(alpha: 0.12),
                            child: const Center(
                              child: SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              ),
                            ),
                          ),
                          errorWidget: (context, url, error) => Container(
                            color: Colors.grey.withValues(alpha: 0.12),
                            child: const Icon(Icons.fastfood, color: Colors.grey, size: 36),
                          ),
                        )
                      : Container(
                          color: Colors.grey.withValues(alpha: 0.12),
                          child: const Icon(Icons.fastfood, color: Colors.grey, size: 36),
                        ),

                  // Hidden overlay tint
                  if (isHidden)
                    Container(
                      color: Colors.black.withValues(alpha: 0.45),
                    ),

                  // Top-start Badges (Popular, New, Spicy)
                  PositionedDirectional(
                    top: 6,
                    start: 6,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (product.isPopular)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 3),
                            child: _StatusChip(
                              icon: Icons.star,
                              label: l10n.popular,
                              color: AppColors.warning,
                            ),
                          ),
                        if (product.isNew)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 3),
                            child: _StatusChip(
                              icon: Icons.auto_awesome,
                              label: isArabic ? 'جديد' : 'New',
                              color: AppColors.success,
                            ),
                          ),
                        if (product.isSpicy)
                          _StatusChip(
                            icon: Icons.local_fire_department,
                            label: isArabic ? 'حار' : 'Spicy',
                            color: AppColors.error,
                          ),
                      ],
                    ),
                  ),

                  // Top-end Badge (Hidden status)
                  if (isHidden)
                    PositionedDirectional(
                      top: 6,
                      end: 6,
                      child: _StatusChip(
                        icon: Icons.visibility_off,
                        label: l10n.outOfStock,
                        color: AppColors.error,
                      ),
                    ),

                  // Bottom Price Tag Chip
                  PositionedDirectional(
                    bottom: 6,
                    end: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.72),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (firstSize.hasDiscount) ...[
                            Text(
                              _fmt(firstSize.oldPrice!),
                              style: const TextStyle(
                                fontSize: 10,
                                color: Colors.white70,
                                decoration: TextDecoration.lineThrough,
                              ),
                            ),
                            const SizedBox(width: 3),
                          ],
                          Text(
                            product.hasMultipleSizes
                                ? '${isArabic ? "من" : "From"} ${_fmt(product.minPrice)}'
                                : _fmt(firstSize.price),
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // MIDDLE: Title & Sizes
          GestureDetector(
            onTap: () => showProductEditSheet(context, product: product),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(8, 6, 8, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.titleAr,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (product.titleEn?.isNotEmpty == true && product.titleEn != product.titleAr)
                    Text(
                      product.titleEn!,
                      style: TextStyle(
                        fontSize: 10,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    )
                  else if (product.hasMultipleSizes)
                    Text(
                      '${product.sizes.length} ${isArabic ? "أحجام" : "sizes"}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AppColors.tealPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                    )
                  else if (firstSize.label.isNotEmpty)
                    Text(
                      firstSize.label,
                      style: TextStyle(
                        fontSize: 10,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
          ),

          const Spacer(),
          const Divider(height: 1, thickness: 0.8),

          // BOTTOM: Action Toolbars in 2 Compact Rows (100% visible, no clipping)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 4),
            color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Row 1 (Status toggles in exact sequence):
                // 1. 👁️ Visibility -> 2. ⭐ Popular -> 3. ✨ New -> 4. 🌶️ Spicy
                Row(
                  children: [
                    // 1. 👁️ Visibility (إظهار / إخفاء)
                    Expanded(
                      child: _ActionIconBtn(
                        icon: Icon(
                          product.isAvailable ? Icons.visibility : Icons.visibility_off,
                          size: 17,
                          color: product.isAvailable ? AppColors.success : AppColors.error,
                        ),
                        tooltip: isArabic
                            ? (product.isAvailable ? 'إخفاء الصنف' : 'إظهار الصنف')
                            : (product.isAvailable ? 'Hide from menu' : 'Show in menu'),
                        onTap: () => ref
                            .read(productsNotifierProvider.notifier)
                            .toggleAvailability(product.id, product.isAvailable),
                      ),
                    ),

                    // 2. ⭐ Popular (مميز)
                    Expanded(
                      child: _ActionIconBtn(
                        icon: Icon(
                          product.isPopular ? Icons.star : Icons.star_border,
                          size: 17,
                          color: product.isPopular ? AppColors.warning : Colors.grey,
                        ),
                        tooltip: isArabic
                            ? (product.isPopular ? 'إلغاء تمييز الصنف' : 'تمييز الصنف')
                            : (product.isPopular ? 'Unmark popular' : 'Mark popular'),
                        onTap: () => ref
                            .read(productsNotifierProvider.notifier)
                            .togglePopular(product.id, product.isPopular),
                      ),
                    ),

                    // 3. ✨ New (جديد)
                    Expanded(
                      child: _ActionIconBtn(
                        icon: Icon(
                          product.isNew ? Icons.auto_awesome : Icons.auto_awesome_outlined,
                          size: 16,
                          color: product.isNew ? AppColors.tealPrimary : Colors.grey,
                        ),
                        tooltip: isArabic
                            ? (product.isNew ? 'إلغاء وسم جديد' : 'وسم كـ جديد')
                            : (product.isNew ? 'Unmark new' : 'Mark as new'),
                        onTap: () => ref
                            .read(productsNotifierProvider.notifier)
                            .toggleNew(product.id, product.isNew),
                      ),
                    ),

                    // 4. 🌶️ Spicy (حار)
                    Expanded(
                      child: _ActionIconBtn(
                        icon: Icon(
                          Icons.local_fire_department,
                          size: 17,
                          color: product.isSpicy ? AppColors.error : Colors.grey.withValues(alpha: 0.45),
                        ),
                        tooltip: isArabic
                            ? (product.isSpicy ? 'إلغاء وسم حار' : 'وسم كـ حار 🌶️')
                            : (product.isSpicy ? 'Unmark spicy' : 'Mark spicy'),
                        onTap: () => ref
                            .read(productsNotifierProvider.notifier)
                            .toggleSpicy(product.id, product.isSpicy),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 3),

                // Row 2 (Management tools):
                // 1. ⬆️⬇️ Reorder -> 2. 📋 Duplicate -> 3. ✏️ Edit -> 4. 🗑️ Delete
                Row(
                  children: [
                    // 1. Reorder Up / Down
                    Expanded(
                      child: Container(
                        height: 28,
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.6),
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Tooltip(
                                message: isArabic ? 'نقل لأعلى' : 'Move Up',
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                  onTap: isFirst
                                      ? null
                                      : () => ref
                                          .read(productsNotifierProvider.notifier)
                                          .moveItem(categoryId, itemIndex, 'up'),
                                  child: Center(
                                    child: Icon(
                                      Icons.keyboard_arrow_up,
                                      size: 16,
                                      color: isFirst
                                          ? Colors.grey.withValues(alpha: 0.3)
                                          : Theme.of(context).colorScheme.onSurface,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                            VerticalDivider(
                              width: 1,
                              thickness: 0.8,
                              indent: 4,
                              endIndent: 4,
                              color: Theme.of(context).dividerColor.withValues(alpha: 0.3),
                            ),
                            Expanded(
                              child: Tooltip(
                                message: isArabic ? 'نقل لأسفل' : 'Move Down',
                                child: InkWell(
                                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                                  onTap: isLast
                                      ? null
                                      : () => ref
                                          .read(productsNotifierProvider.notifier)
                                          .moveItem(categoryId, itemIndex, 'down'),
                                  child: Center(
                                    child: Icon(
                                      Icons.keyboard_arrow_down,
                                      size: 16,
                                      color: isLast
                                          ? Colors.grey.withValues(alpha: 0.3)
                                          : Theme.of(context).colorScheme.onSurface,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    // 2. Duplicate (نسخ)
                    Expanded(
                      child: _ActionIconBtn(
                        icon: const Icon(Icons.copy_outlined, size: 16, color: Colors.blueGrey),
                        tooltip: isArabic ? 'نسخ الصنف' : 'Duplicate Item',
                        onTap: () async {
                          try {
                            await ref
                                .read(productsNotifierProvider.notifier)
                                .duplicateProduct(product);
                            if (context.mounted) {
                              showAppSnackBar(
                                context,
                                isArabic ? 'تم نسخ الصنف بنجاح' : 'Item duplicated successfully',
                                type: AppSnackBarType.success,
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                            }
                          }
                        },
                      ),
                    ),

                    // 3. Edit (تعديل)
                    Expanded(
                      child: _ActionIconBtn(
                        icon: const Icon(Icons.edit_outlined, size: 16, color: AppColors.tealPrimary),
                        tooltip: l10n.edit,
                        onTap: () => showProductEditSheet(context, product: product),
                      ),
                    ),

                    // 4. Delete (حذف)
                    Expanded(
                      child: _ActionIconBtn(
                        icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.error),
                        tooltip: l10n.delete,
                        onTap: () async {
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (ctx) => AlertDialog(
                              title: Text(isArabic ? 'حذف الصنف' : 'Delete Item'),
                              content: Text(
                                isArabic
                                    ? 'هل أنت متأكد من حذف صنف "${product.titleAr}"؟'
                                    : 'Are you sure you want to delete "${product.titleAr}"?',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(ctx, false),
                                  child: Text(l10n.cancel),
                                ),
                                TextButton(
                                  style: TextButton.styleFrom(foregroundColor: AppColors.error),
                                  onPressed: () => Navigator.pop(ctx, true),
                                  child: Text(l10n.delete),
                                ),
                              ],
                            ),
                          );
                          if (confirmed != true) return;
                          try {
                            await ref
                                .read(productsNotifierProvider.notifier)
                                .deleteProduct(product.id);
                            if (context.mounted) {
                              showAppSnackBar(
                                context,
                                isArabic ? 'تم حذف الصنف' : 'Item deleted',
                                type: AppSnackBarType.info,
                              );
                            }
                          } catch (e) {
                            if (context.mounted) {
                              showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                            }
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  static String _fmt(double v) =>
      v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);
}

// ============================================================================
// COMPACT ACTION ICON BUTTON (ضمان توزيع المساحة بالتساوي وتجنب القص)
// ============================================================================
class _ActionIconBtn extends StatelessWidget {
  final Widget icon;
  final String tooltip;
  final VoidCallback? onTap;

  const _ActionIconBtn({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          child: SizedBox(
            height: 28,
            child: Center(child: icon),
          ),
        ),
      ),
    );
  }
}

// ============================================================================
// STATUS CHIP BADGE
// ============================================================================
class _StatusChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _StatusChip({
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: color),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 9.5,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

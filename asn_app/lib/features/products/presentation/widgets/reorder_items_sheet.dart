import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/products/presentation/providers/products_provider.dart';

void showReorderItemsSheet(BuildContext context, List<ProductModel> products) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (ctx) => ReorderItemsSheet(products: products),
  );
}

/// Drag-and-drop ordering for a category's items; index becomes sort_order,
/// mirroring the web dashboard's move up/down controls.
class ReorderItemsSheet extends ConsumerStatefulWidget {
  final List<ProductModel> products;

  const ReorderItemsSheet({super.key, required this.products});

  @override
  ConsumerState<ReorderItemsSheet> createState() => _ReorderItemsSheetState();
}

class _ReorderItemsSheetState extends ConsumerState<ReorderItemsSheet> {
  late List<ProductModel> _items;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _items = List.of(widget.products);
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref
          .read(productsNotifierProvider.notifier)
          .reorderProducts(_items.map((p) => p.id).toList());
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        showAppSnackBar(context, '$e', type: AppSnackBarType.error);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Column(
              children: [
                Text(l10n.sortItems, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 4),
                Text(
                  l10n.dragToReorder,
                  style: TextStyle(
                    fontSize: 12,
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          AppSpacing.heightSm,
          const Divider(height: 1),
          Expanded(
            child: ReorderableListView.builder(
              scrollController: scrollController,
              padding: const EdgeInsets.all(AppSpacing.sm),
              itemCount: _items.length,
              onReorder: (oldIndex, newIndex) {
                setState(() {
                  if (newIndex > oldIndex) newIndex--;
                  final item = _items.removeAt(oldIndex);
                  _items.insert(newIndex, item);
                });
              },
              itemBuilder: (context, index) {
                final product = _items[index];
                return ListTile(
                  key: ValueKey(product.id),
                  leading: ClipRRect(
                    borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    child: SizedBox(
                      width: 40,
                      height: 40,
                      child: product.imageUrl?.isNotEmpty == true
                          ? CachedNetworkImage(imageUrl: product.imageUrl!, fit: BoxFit.cover)
                          : Container(
                              color: Colors.grey.withValues(alpha: 0.15),
                              child: const Icon(Icons.fastfood, size: 20, color: Colors.grey),
                            ),
                    ),
                  ),
                  title: Text(
                    product.titleAr,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  trailing: ReorderableDragStartListener(
                    index: index,
                    child: const Icon(Icons.drag_handle, color: Colors.grey),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: _saving ? null : () => Navigator.pop(context),
                      child: Text(l10n.cancel),
                    ),
                  ),
                  AppSpacing.widthSm,
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: _saving ? null : _save,
                      child: _saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(l10n.save),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

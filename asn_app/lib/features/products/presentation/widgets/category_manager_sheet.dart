import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:image_picker/image_picker.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/features/products/data/services/image_upload_service.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/products/data/models/category_model.dart';
import 'package:asn_app/features/products/presentation/providers/categories_provider.dart';
import 'package:asn_app/features/products/presentation/providers/products_provider.dart';

void showCategoryManagerSheet(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (ctx) => const CategoryManagerSheet(),
  );
}

class CategoryManagerSheet extends ConsumerWidget {
  const CategoryManagerSheet({super.key});

  Future<void> _showCategoryDialog(
    BuildContext context,
    WidgetRef ref, {
    CategoryModel? category,
  }) async {
    final l10n = AppLocalizations.of(context)!;
    final nameArController = TextEditingController(text: category?.nameAr ?? '');
    final nameEnController = TextEditingController(
      text: (category?.nameEn != null && category?.nameEn != category?.nameAr) ? category!.nameEn! : '',
    );
    final emojiController = TextEditingController(text: category?.emoji ?? '');

    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(category == null ? l10n.addCategory : l10n.edit),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameArController,
              autofocus: true,
              decoration: InputDecoration(labelText: l10n.nameArabic),
            ),
            AppSpacing.heightSm,
            TextField(
              controller: nameEnController,
              decoration: InputDecoration(labelText: l10n.nameEnglish),
            ),
            AppSpacing.heightSm,
            TextField(
              controller: emojiController,
              maxLength: 4,
              decoration: InputDecoration(
                labelText: l10n.emoji,
                counterText: '',
                hintText: '🍕',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(l10n.cancel)),
          ElevatedButton(
            onPressed: () async {
              final nameAr = nameArController.text.trim();
              if (nameAr.isEmpty) return;
              final nameEn = nameEnController.text.trim();
              final emoji = emojiController.text.trim();
              Navigator.pop(ctx);
              try {
                final notifier = ref.read(categoriesNotifierProvider.notifier);
                if (category == null) {
                  await notifier.addCategory(
                    nameAr,
                    nameEn: nameEn.isEmpty ? null : nameEn,
                    emoji: emoji.isEmpty ? null : emoji,
                  );
                } else {
                  await notifier.renameCategory(
                    category.id,
                    nameAr,
                    nameEn: nameEn.isEmpty ? null : nameEn,
                    emoji: emoji.isEmpty ? null : emoji,
                  );
                }
                await ref.read(productsNotifierProvider.notifier).refresh();
              } catch (e) {
                if (context.mounted) showAppSnackBar(context, '$e', type: AppSnackBarType.error);
              }
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }

  Future<void> _pickCategoryImage(BuildContext context, WidgetRef ref, CategoryModel category) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1200,
      imageQuality: 85,
    );
    if (picked == null || !context.mounted) return;

    try {
      final url = await ref.read(imageUploadServiceProvider).uploadImage(File(picked.path));
      await ref.read(categoriesNotifierProvider.notifier).updateCategoryImage(category.id, url);
    } catch (e) {
      if (context.mounted) showAppSnackBar(context, '$e', type: AppSnackBarType.error);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final categoriesAsync = ref.watch(categoriesNotifierProvider);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      builder: (context, scrollController) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(l10n.manageCategories, style: Theme.of(context).textTheme.titleLarge),
                TextButton.icon(
                  onPressed: () => _showCategoryDialog(context, ref),
                  icon: const Icon(Icons.add, size: 18),
                  label: Text(l10n.addCategory),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: categoriesAsync.when(
              data: (categories) {
                if (categories.isEmpty) {
                  return AppEmptyState(icon: Icons.category_outlined, message: l10n.addCategory);
                }
                return ListView.builder(
                  controller: scrollController,
                  padding: const EdgeInsets.all(AppSpacing.sm),
                  itemCount: categories.length,
                  itemBuilder: (context, index) {
                    final cat = categories[index];
                    return ListTile(
                      leading: GestureDetector(
                        onTap: () => _pickCategoryImage(context, ref, cat),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                          child: SizedBox(
                            width: 44,
                            height: 44,
                            child: cat.imageUrl?.isNotEmpty == true
                                ? CachedNetworkImage(imageUrl: cat.imageUrl!, fit: BoxFit.cover)
                                : Container(
                                    color: AppColors.tealPrimary.withValues(alpha: 0.08),
                                    child: Center(
                                      child: cat.emoji?.isNotEmpty == true
                                          ? Text(cat.emoji!, style: const TextStyle(fontSize: 20))
                                          : const Icon(Icons.add_photo_alternate_outlined,
                                              size: 20, color: AppColors.tealPrimary),
                                    ),
                                  ),
                          ),
                        ),
                      ),
                      title: Text(
                        cat.localizedName(isArabic),
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, size: 20),
                            onPressed: () => _showCategoryDialog(context, ref, category: cat),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.error),
                            onPressed: () async {
                              final confirmed = await showDialog<bool>(
                                context: context,
                                builder: (ctx) => AlertDialog(
                                  title: Text(l10n.deleteConfirmTitle),
                                  content: Text(cat.nameAr),
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
                                    .deleteCategory(cat.id);
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
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => AppErrorState(
                error: err,
                onRetry: () => ref.read(categoriesNotifierProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

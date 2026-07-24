import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/products/data/services/image_upload_service.dart';
import 'package:asn_app/features/products/presentation/providers/products_provider.dart';
import 'package:asn_app/features/products/presentation/providers/categories_provider.dart';

void showProductEditSheet(BuildContext context, {ProductModel? product, String? initialCategoryId}) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (ctx) => ProductEditSheet(product: product, initialCategoryId: initialCategoryId),
  );
}

class _SizeRow {
  final TextEditingController label;
  final TextEditingController price;
  final TextEditingController oldPrice;

  _SizeRow({String? labelText, String? priceText, String? oldPriceText})
      : label = TextEditingController(text: labelText ?? ''),
        price = TextEditingController(text: priceText ?? ''),
        oldPrice = TextEditingController(text: oldPriceText ?? '');

  void dispose() {
    label.dispose();
    price.dispose();
    oldPrice.dispose();
  }
}

class ProductEditSheet extends ConsumerStatefulWidget {
  final ProductModel? product;
  final String? initialCategoryId;

  const ProductEditSheet({super.key, this.product, this.initialCategoryId});

  @override
  ConsumerState<ProductEditSheet> createState() => _ProductEditSheetState();
}

class _ProductEditSheetState extends ConsumerState<ProductEditSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _titleArController;
  late final TextEditingController _titleEnController;
  late final TextEditingController _descController;
  late final List<_SizeRow> _sizeRows;
  String? _categoryId;
  String? _imageUrl;
  bool _isAvailable = true;
  bool _isPopular = false;
  bool _isSpicy = false;
  bool _saving = false;
  bool _uploading = false;

  static String _fmt(double v) =>
      v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);

  @override
  void initState() {
    super.initState();
    final p = widget.product;
    _titleArController = TextEditingController(text: p?.titleAr ?? '');
    _titleEnController =
        TextEditingController(text: (p?.titleEn != null && p?.titleEn != p?.titleAr) ? p!.titleEn! : '');
    _descController = TextEditingController(text: p?.descAr ?? '');
    _categoryId = p?.categoryId ?? widget.initialCategoryId;
    _imageUrl = p?.imageUrl;
    _isAvailable = p?.isAvailable ?? true;
    _isPopular = p?.isPopular ?? false;
    _isSpicy = p?.isSpicy ?? false;
    _sizeRows = (p?.sizes ?? [const ProductSize(label: '', price: 0)])
        .map((s) => _SizeRow(
              labelText: s.label,
              priceText: s.price > 0 ? _fmt(s.price) : '',
              oldPriceText: s.oldPrice != null ? _fmt(s.oldPrice!) : '',
            ))
        .toList();
  }

  @override
  void dispose() {
    _titleArController.dispose();
    _titleEnController.dispose();
    _descController.dispose();
    for (final row in _sizeRows) {
      row.dispose();
    }
    super.dispose();
  }

  Future<void> _pickAndUploadImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(
      source: ImageSource.gallery,
      maxWidth: 1600,
      imageQuality: 85,
    );
    if (picked == null) return;

    setState(() => _uploading = true);
    try {
      final url = await ref.read(imageUploadServiceProvider).uploadImage(File(picked.path));
      if (mounted) setState(() => _imageUrl = url);
    } catch (e) {
      if (mounted) showAppSnackBar(context, '$e', type: AppSnackBarType.error);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  List<ProductSize> _collectSizes() {
    return _sizeRows
        .map((row) => ProductSize(
              label: row.label.text.trim(),
              price: double.tryParse(row.price.text.trim()) ?? 0,
              oldPrice: double.tryParse(row.oldPrice.text.trim()),
            ))
        .where((s) => s.price > 0)
        .toList();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    if (!_formKey.currentState!.validate()) return;
    final sizes = _collectSizes();
    if (sizes.isEmpty || _categoryId == null) {
      showAppSnackBar(context, l10n.fieldRequired, type: AppSnackBarType.error);
      return;
    }

    setState(() => _saving = true);
    final notifier = ref.read(productsNotifierProvider.notifier);
    final titleAr = _titleArController.text.trim();
    final titleEn = _titleEnController.text.trim();
    final desc = _descController.text.trim();

    try {
      if (widget.product == null) {
        await notifier.addProduct(
          titleAr: titleAr,
          titleEn: titleEn.isEmpty ? null : titleEn,
          descAr: desc.isEmpty ? null : desc,
          sizes: sizes,
          imageUrl: _imageUrl,
          categoryId: _categoryId!,
          isAvailable: _isAvailable,
          isPopular: _isPopular,
          isSpicy: _isSpicy,
        );
      } else {
        await notifier.updateProduct(
          productId: widget.product!.id,
          titleAr: titleAr,
          titleEn: titleEn.isEmpty ? null : titleEn,
          descAr: desc.isEmpty ? null : desc,
          sizes: sizes,
          imageUrl: _imageUrl,
          categoryId: _categoryId,
          isAvailable: _isAvailable,
          isPopular: _isPopular,
          isSpicy: _isSpicy,
        );
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        showAppSnackBar(context, '$e', type: AppSnackBarType.error);
      }
    }
  }

  Future<void> _delete() async {
    final l10n = AppLocalizations.of(context)!;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(l10n.deleteConfirmTitle),
        content: Text(widget.product!.name),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(l10n.cancel)),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: AppColors.error),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text(l10n.delete),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _saving = true);
    try {
      await ref.read(productsNotifierProvider.notifier).deleteProduct(widget.product!.id);
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
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final categories = ref.watch(categoriesNotifierProvider).value ?? const [];

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (context, scrollController) => Form(
          key: _formKey,
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.fromLTRB(AppSpacing.md, 0, AppSpacing.md, AppSpacing.xl),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.product == null ? l10n.addProduct : l10n.edit,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  if (widget.product != null)
                    IconButton(
                      tooltip: l10n.delete,
                      icon: const Icon(Icons.delete_outline, color: AppColors.error),
                      onPressed: _saving ? null : _delete,
                    ),
                ],
              ),
              AppSpacing.heightSm,

              // Image picker / preview
              GestureDetector(
                onTap: _uploading ? null : _pickAndUploadImage,
                child: Container(
                  height: 150,
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                    border: Border.all(color: Theme.of(context).colorScheme.outline),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _uploading
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const CircularProgressIndicator(),
                              AppSpacing.heightXs,
                              Text(l10n.uploadingImage, style: const TextStyle(fontSize: 12)),
                            ],
                          ),
                        )
                      : (_imageUrl != null && _imageUrl!.isNotEmpty)
                          ? Stack(
                              fit: StackFit.expand,
                              children: [
                                CachedNetworkImage(imageUrl: _imageUrl!, fit: BoxFit.cover),
                                const Positioned(
                                  bottom: 8,
                                  right: 8,
                                  child: CircleAvatar(
                                    backgroundColor: Colors.black54,
                                    radius: 16,
                                    child: Icon(Icons.edit, size: 16, color: Colors.white),
                                  ),
                                ),
                              ],
                            )
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.add_photo_alternate_outlined,
                                    size: 36, color: Colors.grey),
                                AppSpacing.heightXs,
                                Text(l10n.uploadImage,
                                    style: const TextStyle(fontSize: 13, color: Colors.grey)),
                              ],
                            ),
                ),
              ),
              AppSpacing.heightMd,

              TextFormField(
                controller: _titleArController,
                decoration: InputDecoration(labelText: l10n.nameArabic),
                validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _titleEnController,
                decoration: InputDecoration(labelText: l10n.nameEnglish),
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _descController,
                decoration: InputDecoration(labelText: l10n.description),
                maxLines: 2,
              ),
              AppSpacing.heightSm,

              DropdownButtonFormField<String>(
                initialValue: categories.any((c) => c.id == _categoryId) ? _categoryId : null,
                decoration: InputDecoration(labelText: l10n.category),
                items: categories
                    .map((c) => DropdownMenuItem(
                          value: c.id,
                          child: Text('${c.emoji ?? ''} ${c.localizedName(isArabic)}'.trim()),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _categoryId = v),
                validator: (v) => v == null ? l10n.fieldRequired : null,
              ),
              AppSpacing.heightMd,

              // Sizes & prices
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(l10n.sizesAndPrices, style: Theme.of(context).textTheme.titleMedium),
                  TextButton.icon(
                    onPressed: () => setState(() => _sizeRows.add(_SizeRow())),
                    icon: const Icon(Icons.add, size: 18),
                    label: Text(l10n.addSize),
                  ),
                ],
              ),
              ..._sizeRows.asMap().entries.map((entry) {
                final index = entry.key;
                final row = entry.value;
                return Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.xs),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: TextFormField(
                          controller: row.label,
                          decoration: InputDecoration(labelText: l10n.sizeLabel, isDense: true),
                        ),
                      ),
                      AppSpacing.widthXs,
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          controller: row.price,
                          decoration: InputDecoration(labelText: l10n.price, isDense: true),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        ),
                      ),
                      AppSpacing.widthXs,
                      Expanded(
                        flex: 2,
                        child: TextFormField(
                          controller: row.oldPrice,
                          decoration: InputDecoration(labelText: l10n.oldPrice, isDense: true),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline, color: AppColors.error, size: 20),
                        onPressed: _sizeRows.length <= 1
                            ? null
                            : () => setState(() => _sizeRows.removeAt(index).dispose()),
                      ),
                    ],
                  ),
                );
              }),
              AppSpacing.heightSm,

              // Toggles
              SwitchListTile(
                value: _isAvailable,
                title: Text(l10n.available),
                secondary: const Icon(Icons.check_circle_outline, color: AppColors.success),
                contentPadding: EdgeInsets.zero,
                onChanged: (v) => setState(() => _isAvailable = v),
              ),
              SwitchListTile(
                value: _isPopular,
                title: Text(l10n.popular),
                secondary: const Icon(Icons.star_outline, color: AppColors.warning),
                contentPadding: EdgeInsets.zero,
                onChanged: (v) => setState(() => _isPopular = v),
              ),
              SwitchListTile(
                value: _isSpicy,
                title: Text(l10n.spicy),
                secondary: const Icon(Icons.local_fire_department_outlined, color: AppColors.error),
                contentPadding: EdgeInsets.zero,
                onChanged: (v) => setState(() => _isSpicy = v),
              ),
              AppSpacing.heightMd,

              Row(
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
                      onPressed: _saving || _uploading ? null : _save,
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
            ],
          ),
        ),
      ),
    );
  }
}

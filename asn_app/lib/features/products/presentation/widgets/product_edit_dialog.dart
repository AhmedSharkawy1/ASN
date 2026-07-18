import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/features/products/data/models/product_model.dart';
import 'package:asn_app/features/products/presentation/providers/products_provider.dart';

class ProductEditDialog extends ConsumerStatefulWidget {
  final ProductModel? product;

  const ProductEditDialog({super.key, this.product});

  @override
  ConsumerState<ProductEditDialog> createState() => _ProductEditDialogState();
}

class _ProductEditDialogState extends ConsumerState<ProductEditDialog> {
  final _formKey = GlobalKey<FormState>();
  
  late TextEditingController _nameController;
  late TextEditingController _priceController;
  late TextEditingController _descriptionController;
  late TextEditingController _imageUrlController;
  bool _isAvailable = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.product?.name ?? '');
    _priceController = TextEditingController(text: widget.product?.price.toString() ?? '');
    _descriptionController = TextEditingController(text: widget.product?.description ?? '');
    _imageUrlController = TextEditingController(text: widget.product?.imageUrl ?? '');
    _isAvailable = widget.product?.isAvailable ?? true;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _priceController.dispose();
    _descriptionController.dispose();
    _imageUrlController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    
    try {
      final name = _nameController.text.trim();
      final price = double.parse(_priceController.text.trim());
      final description = _descriptionController.text.trim();
      final imageUrl = _imageUrlController.text.trim();

      if (widget.product == null) {
        // Add
        await ref.read(productsNotifierProvider.notifier).addProduct(
          name, price, description.isEmpty ? null : description, imageUrl.isEmpty ? null : imageUrl, _isAvailable
        );
      } else {
        // Update
        await ref.read(productsNotifierProvider.notifier).updateProduct(
          widget.product!.id, name, price, description.isEmpty ? null : description, imageUrl.isEmpty ? null : imageUrl, _isAvailable
        );
      }
      
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()), backgroundColor: AppColors.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _delete() async {
    if (widget.product == null) return;
    
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Product?'),
        content: const Text('Are you sure you want to permanently delete this product?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('CANCEL')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true), 
            child: const Text('DELETE', style: TextStyle(color: AppColors.error)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isLoading = true);
    try {
      await ref.read(productsNotifierProvider.notifier).deleteProduct(widget.product!.id);
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(e.toString()), backgroundColor: AppColors.error,
        ));
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.product != null;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppSpacing.radiusLg)),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        width: 400,
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      isEditing ? 'Edit Product' : 'Add Product',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    if (isEditing)
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: AppColors.error),
                        onPressed: _isLoading ? null : _delete,
                      ),
                  ],
                ),
                const Divider(),
                AppSpacing.heightSm,
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Product Name', border: OutlineInputBorder()),
                  validator: (val) => val == null || val.trim().isEmpty ? 'Required' : null,
                ),
                AppSpacing.heightSm,
                TextFormField(
                  controller: _priceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Price', border: OutlineInputBorder(), prefixText: '\$'),
                  validator: (val) {
                    if (val == null || val.trim().isEmpty) return 'Required';
                    if (double.tryParse(val) == null) return 'Invalid number';
                    return null;
                  },
                ),
                AppSpacing.heightSm,
                TextFormField(
                  controller: _descriptionController,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: 'Description (Optional)', border: OutlineInputBorder()),
                ),
                AppSpacing.heightSm,
                TextFormField(
                  controller: _imageUrlController,
                  decoration: const InputDecoration(labelText: 'Image URL (Optional)', border: OutlineInputBorder()),
                ),
                AppSpacing.heightSm,
                SwitchListTile(
                  title: const Text('Is Available'),
                  value: _isAvailable,
                  activeTrackColor: AppColors.tealPrimary.withValues(alpha: 0.5),
                  activeThumbColor: AppColors.tealPrimary,
                  onChanged: (val) => setState(() => _isAvailable = val),
                  contentPadding: EdgeInsets.zero,
                ),
                AppSpacing.heightMd,
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: _isLoading ? null : () => Navigator.pop(context),
                      child: const Text('CANCEL'),
                    ),
                    AppSpacing.widthSm,
                    ElevatedButton(
                      onPressed: _isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.tealPrimary,
                        foregroundColor: Colors.white,
                      ),
                      child: _isLoading 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Text(isEditing ? 'SAVE' : 'ADD'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

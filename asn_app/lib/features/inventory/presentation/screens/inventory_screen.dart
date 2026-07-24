import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_search_field.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/inventory/data/models/inventory_item_model.dart';
import 'package:asn_app/features/inventory/presentation/providers/inventory_provider.dart';

class InventoryScreen extends ConsumerStatefulWidget {
  const InventoryScreen({super.key});

  @override
  ConsumerState<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends ConsumerState<InventoryScreen> {
  String _searchQuery = '';
  bool _lowStockOnly = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final inventoryAsync = ref.watch(inventoryNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.inventory),
        actions: [
          IconButton(
            tooltip: l10n.lowStock,
            icon: Icon(
              _lowStockOnly ? Icons.warning : Icons.warning_amber_outlined,
              color: _lowStockOnly ? AppColors.warning : null,
            ),
            onPressed: () => setState(() => _lowStockOnly = !_lowStockOnly),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(inventoryNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: Column(
        children: [
          AppSearchField(onChanged: (value) => setState(() => _searchQuery = value)),
          Expanded(
            child: inventoryAsync.when(
              data: (items) {
                var filtered = items;
                if (_lowStockOnly) {
                  filtered = filtered.where((i) => i.isLowStock).toList();
                }
                if (_searchQuery.isNotEmpty) {
                  final q = _searchQuery.toLowerCase();
                  filtered = filtered
                      .where((i) =>
                          i.name.toLowerCase().contains(q) ||
                          (i.supplier?.toLowerCase().contains(q) ?? false) ||
                          (i.category?.toLowerCase().contains(q) ?? false))
                      .toList();
                }

                if (filtered.isEmpty) {
                  return AppEmptyState(
                    icon: Icons.inventory_2_outlined,
                    message: l10n.noInventoryItems,
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(inventoryNotifierProvider.notifier).refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: filtered.length,
                    separatorBuilder: (context, index) => AppSpacing.heightXs,
                    itemBuilder: (context, index) => _InventoryItemCard(item: filtered[index]),
                  ),
                );
              },
              loading: () => const AppListSkeleton(),
              error: (err, stack) => AppErrorState(
                error: err,
                onRetry: () => ref.read(inventoryNotifierProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showDialog<void>(
          context: context,
          builder: (ctx) => const InventoryItemDialog(),
        ),
        backgroundColor: AppColors.tealPrimary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}

class _InventoryItemCard extends ConsumerWidget {
  final InventoryItemModel item;

  const _InventoryItemCard({required this.item});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final notifier = ref.read(inventoryNotifierProvider.notifier);

    Future<void> adjust(double delta) async {
      try {
        await notifier.adjustQuantity(item.id, item.quantity + delta);
      } catch (e) {
        if (context.mounted) {
          showAppSnackBar(context, '$e', type: AppSnackBarType.error);
        }
      }
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: item.isLowStock
            ? Border.all(color: AppColors.warning.withValues(alpha: 0.6))
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: (item.isLowStock ? AppColors.warning : AppColors.tealPrimary).withValues(alpha: 0.1),
            child: Icon(
              item.isLowStock ? Icons.warning_amber : Icons.inventory_2_outlined,
              color: item.isLowStock ? AppColors.warning : AppColors.tealPrimary,
              size: 20,
            ),
          ),
          AppSpacing.widthSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_formatQty(item.quantity)} ${item.unit}'
                  '${item.isLowStock ? ' • ${l10n.lowStock}' : ''}',
                  style: TextStyle(
                    fontSize: 12,
                    color: item.isLowStock ? AppColors.warning : Colors.grey,
                    fontWeight: item.isLowStock ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.remove_circle_outline),
            color: AppColors.error,
            onPressed: item.quantity <= 0 ? null : () => adjust(-1),
          ),
          Text(
            _formatQty(item.quantity),
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          ),
          IconButton(
            icon: const Icon(Icons.add_circle_outline),
            color: AppColors.tealPrimary,
            onPressed: () => adjust(1),
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'edit') {
                showDialog<void>(
                  context: context,
                  builder: (ctx) => InventoryItemDialog(item: item),
                );
              } else if (value == 'delete') {
                showDialog<void>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(l10n.deleteConfirmTitle),
                    content: Text(item.name),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: Text(l10n.cancel),
                      ),
                      TextButton(
                        style: TextButton.styleFrom(foregroundColor: AppColors.error),
                        onPressed: () async {
                          Navigator.pop(ctx);
                          try {
                            await notifier.deleteItem(item.id);
                          } catch (e) {
                            if (context.mounted) {
                              showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                            }
                          }
                        },
                        child: Text(l10n.delete),
                      ),
                    ],
                  ),
                );
              }
            },
            itemBuilder: (ctx) => [
              PopupMenuItem(value: 'edit', child: Text(l10n.edit)),
              PopupMenuItem(value: 'delete', child: Text(l10n.delete)),
            ],
          ),
        ],
      ),
    );
  }

  static String _formatQty(double qty) {
    return qty == qty.roundToDouble() ? qty.toInt().toString() : qty.toStringAsFixed(2);
  }
}

class InventoryItemDialog extends ConsumerStatefulWidget {
  final InventoryItemModel? item;

  const InventoryItemDialog({super.key, this.item});

  @override
  ConsumerState<InventoryItemDialog> createState() => _InventoryItemDialogState();
}

class _InventoryItemDialogState extends ConsumerState<InventoryItemDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _quantityController;
  late final TextEditingController _minStockController;
  late final TextEditingController _costController;
  late final TextEditingController _supplierController;
  late String _unit;
  bool _saving = false;

  static const _units = ['kg', 'piece', 'liter', 'pack', 'gram', 'unit'];

  @override
  void initState() {
    super.initState();
    final item = widget.item;
    _nameController = TextEditingController(text: item?.name ?? '');
    _quantityController = TextEditingController(text: item != null ? _InventoryItemCard._formatQty(item.quantity) : '');
    _minStockController = TextEditingController(text: item != null ? _InventoryItemCard._formatQty(item.minimumStock) : '');
    _costController = TextEditingController(text: item != null ? item.costPerUnit.toString() : '');
    _supplierController = TextEditingController(text: item?.supplier ?? '');
    _unit = item?.unit ?? 'kg';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _quantityController.dispose();
    _minStockController.dispose();
    _costController.dispose();
    _supplierController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final notifier = ref.read(inventoryNotifierProvider.notifier);
    final name = _nameController.text.trim();
    final quantity = double.tryParse(_quantityController.text.trim()) ?? 0;
    final minStock = double.tryParse(_minStockController.text.trim()) ?? 0;
    final cost = double.tryParse(_costController.text.trim()) ?? 0;
    final supplier = _supplierController.text.trim().isEmpty ? null : _supplierController.text.trim();

    try {
      if (widget.item == null) {
        await notifier.addItem(
          name: name,
          quantity: quantity,
          unit: _unit,
          minimumStock: minStock,
          costPerUnit: cost,
          supplier: supplier,
        );
      } else {
        await notifier.updateItem(
          itemId: widget.item!.id,
          name: name,
          quantity: quantity,
          unit: _unit,
          minimumStock: minStock,
          costPerUnit: cost,
          supplier: supplier,
          category: widget.item!.category,
        );
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;

    return AlertDialog(
      title: Text(widget.item == null ? l10n.addItem : l10n.edit),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(labelText: l10n.itemName),
                validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
              ),
              AppSpacing.heightSm,
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _quantityController,
                      decoration: InputDecoration(labelText: l10n.quantity),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      validator: (v) => (v == null || double.tryParse(v.trim()) == null) ? l10n.fieldRequired : null,
                    ),
                  ),
                  AppSpacing.widthSm,
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _unit,
                      decoration: InputDecoration(labelText: l10n.unit),
                      items: _units
                          .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                          .toList(),
                      onChanged: (v) => setState(() => _unit = v ?? 'kg'),
                    ),
                  ),
                ],
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _minStockController,
                decoration: InputDecoration(labelText: l10n.minimumStock),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _costController,
                decoration: InputDecoration(labelText: l10n.costPerUnit),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _supplierController,
                decoration: InputDecoration(labelText: l10n.supplier),
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: Text(l10n.cancel),
        ),
        ElevatedButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : Text(l10n.save),
        ),
      ],
    );
  }
}

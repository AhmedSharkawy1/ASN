import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_card.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/recipes/data/models/recipe_model.dart';
import 'package:asn_app/features/recipes/presentation/providers/recipes_provider.dart';
import 'package:asn_app/features/inventory/data/models/inventory_item_model.dart';
import 'package:asn_app/features/inventory/presentation/providers/inventory_provider.dart';

String _fmt(double v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(2);

class RecipesScreen extends ConsumerWidget {
  const RecipesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final recipesAsync = ref.watch(recipesNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.recipes),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(recipesNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: recipesAsync.when(
        data: (recipes) {
          if (recipes.isEmpty) {
            return AppEmptyState(icon: Icons.menu_book_outlined, message: l10n.noRecipes);
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(recipesNotifierProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: recipes.length,
              separatorBuilder: (context, index) => AppSpacing.heightXs,
              itemBuilder: (context, index) => _RecipeCard(recipe: recipes[index]),
            ),
          );
        },
        loading: () => const AppListSkeleton(),
        error: (err, stack) => AppErrorState(
          error: err,
          onRetry: () => ref.read(recipesNotifierProvider.notifier).refresh(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showDialog<void>(
          context: context,
          builder: (ctx) => const RecipeEditDialog(),
        ),
        backgroundColor: AppColors.tealPrimary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text(l10n.addRecipe, style: const TextStyle(color: Colors.white)),
      ),
    );
  }
}

class _RecipeCard extends ConsumerWidget {
  final RecipeModel recipe;

  const _RecipeCard({required this.recipe});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: AppColors.shadowOf(context),
      ),
      clipBehavior: Clip.antiAlias,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => showModalBottomSheet<void>(
            context: context,
            isScrollControlled: true,
            useSafeArea: true,
            builder: (ctx) => RecipeDetailSheet(recipeId: recipe.id),
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Row(
              children: [
                const AppIconBadge(icon: Icons.menu_book, color: AppColors.moduleInventory),
                AppSpacing.widthSm,
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        recipe.productName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${recipe.ingredients.length} ${l10n.ingredients}',
                        style: const TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _fmt(recipe.productCost),
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                        color: AppColors.tealPrimary,
                      ),
                    ),
                    Text(l10n.productCost, style: const TextStyle(fontSize: 10, color: Colors.grey)),
                  ],
                ),
                const Icon(Icons.chevron_right, color: Colors.grey),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class RecipeDetailSheet extends ConsumerWidget {
  final String recipeId;

  const RecipeDetailSheet({super.key, required this.recipeId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final recipes = ref.watch(recipesNotifierProvider).value ?? const <RecipeModel>[];
    final recipe = recipes.where((r) => r.id == recipeId).firstOrNull;
    if (recipe == null) return const SizedBox.shrink();

    final notifier = ref.read(recipesNotifierProvider.notifier);

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      builder: (context, scrollController) => ListView(
        controller: scrollController,
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(recipe.productName, style: Theme.of(context).textTheme.titleLarge),
              ),
              IconButton(
                icon: const Icon(Icons.edit_outlined),
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (ctx) => RecipeEditDialog(recipe: recipe),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline, color: AppColors.error),
                onPressed: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: Text(l10n.deleteConfirmTitle),
                      content: Text(recipe.productName),
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
                  if (confirmed == true) {
                    try {
                      await notifier.deleteRecipe(recipe.id);
                      if (context.mounted) Navigator.pop(context);
                    } catch (e) {
                      if (context.mounted) showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                    }
                  }
                },
              ),
            ],
          ),
          Row(
            children: [
              const Icon(Icons.attach_money, size: 16, color: AppColors.tealPrimary),
              Text(
                '${l10n.productCost}: ${_fmt(recipe.productCost)}',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ],
          ),
          if (recipe.notes?.isNotEmpty == true) ...[
            AppSpacing.heightXs,
            Text(recipe.notes!, style: const TextStyle(fontSize: 13, color: Colors.grey)),
          ],
          const Divider(height: AppSpacing.lg),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(l10n.ingredients, style: Theme.of(context).textTheme.titleMedium),
              TextButton.icon(
                icon: const Icon(Icons.add, size: 18),
                label: Text(l10n.addIngredient),
                onPressed: () => showDialog<void>(
                  context: context,
                  builder: (ctx) => _AddIngredientDialog(recipeId: recipe.id),
                ),
              ),
            ],
          ),
          if (recipe.ingredients.isEmpty)
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text(l10n.noIngredients, style: const TextStyle(color: Colors.grey)),
            )
          else
            ...recipe.ingredients.map(
              (ing) => ListTile(
                dense: true,
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.circle, size: 8, color: AppColors.tealPrimary),
                title: Text(ing.inventoryItemName ?? '—', style: const TextStyle(fontSize: 14)),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${_fmt(ing.quantity)} ${ing.unit}',
                        style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                    IconButton(
                      icon: const Icon(Icons.close, size: 18, color: AppColors.error),
                      onPressed: () async {
                        try {
                          await notifier.removeIngredient(ing.id);
                        } catch (e) {
                          if (context.mounted) showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                        }
                      },
                    ),
                  ],
                ),
              ),
            ),
          AppSpacing.heightLg,
        ],
      ),
    );
  }
}

class RecipeEditDialog extends ConsumerStatefulWidget {
  final RecipeModel? recipe;

  const RecipeEditDialog({super.key, this.recipe});

  @override
  ConsumerState<RecipeEditDialog> createState() => _RecipeEditDialogState();
}

class _RecipeEditDialogState extends ConsumerState<RecipeEditDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _costController;
  late final TextEditingController _notesController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.recipe?.productName ?? '');
    _costController = TextEditingController(
        text: widget.recipe != null ? _fmt(widget.recipe!.productCost) : '');
    _notesController = TextEditingController(text: widget.recipe?.notes ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _costController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    final notifier = ref.read(recipesNotifierProvider.notifier);
    final name = _nameController.text.trim();
    final cost = double.tryParse(_costController.text.trim()) ?? 0;
    final notes = _notesController.text.trim().isEmpty ? null : _notesController.text.trim();

    try {
      if (widget.recipe == null) {
        await notifier.addRecipe(productName: name, productCost: cost, notes: notes);
      } else {
        await notifier.updateRecipe(
          recipeId: widget.recipe!.id,
          productName: name,
          productCost: cost,
          notes: notes,
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    return AlertDialog(
      title: Text(widget.recipe == null ? l10n.addRecipe : l10n.edit),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(labelText: l10n.productName),
                validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _costController,
                decoration: InputDecoration(labelText: l10n.productCost),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _notesController,
                decoration: InputDecoration(labelText: l10n.notes),
                maxLines: 2,
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

class _AddIngredientDialog extends ConsumerStatefulWidget {
  final String recipeId;

  const _AddIngredientDialog({required this.recipeId});

  @override
  ConsumerState<_AddIngredientDialog> createState() => _AddIngredientDialogState();
}

class _AddIngredientDialogState extends ConsumerState<_AddIngredientDialog> {
  String? _inventoryItemId;
  String _unit = 'kg';
  final _qtyController = TextEditingController();
  bool _saving = false;

  static const _units = ['kg', 'piece', 'liter', 'pack', 'gram', 'unit'];

  @override
  void dispose() {
    _qtyController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = AppLocalizations.of(context)!;
    final qty = double.tryParse(_qtyController.text.trim());
    if (_inventoryItemId == null || qty == null) {
      showAppSnackBar(context, l10n.fieldRequired, type: AppSnackBarType.error);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(recipesNotifierProvider.notifier).addIngredient(
            recipeId: widget.recipeId,
            inventoryItemId: _inventoryItemId!,
            quantity: qty,
            unit: _unit,
          );
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
    final inventory = ref.watch(inventoryNotifierProvider).value ?? const <InventoryItemModel>[];

    return AlertDialog(
      title: Text(l10n.addIngredient),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DropdownButtonFormField<String>(
            initialValue: _inventoryItemId,
            isExpanded: true,
            decoration: InputDecoration(labelText: l10n.ingredient),
            items: inventory
                .map((item) => DropdownMenuItem(
                      value: item.id,
                      child: Text(item.name, overflow: TextOverflow.ellipsis),
                    ))
                .toList(),
            onChanged: (v) => setState(() => _inventoryItemId = v),
          ),
          AppSpacing.heightSm,
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _qtyController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: l10n.quantity),
                ),
              ),
              AppSpacing.widthSm,
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _unit,
                  decoration: InputDecoration(labelText: l10n.unit),
                  items: _units.map((u) => DropdownMenuItem(value: u, child: Text(u))).toList(),
                  onChanged: (v) => setState(() => _unit = v ?? 'kg'),
                ),
              ),
            ],
          ),
        ],
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

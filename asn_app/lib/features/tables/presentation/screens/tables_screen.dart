import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/tables/data/models/table_model.dart';
import 'package:asn_app/features/tables/presentation/providers/tables_provider.dart';

class TablesScreen extends ConsumerWidget {
  const TablesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final tablesAsync = ref.watch(tablesNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.tables),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(tablesNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: tablesAsync.when(
        data: (tables) {
          if (tables.isEmpty) {
            return AppEmptyState(
              icon: Icons.table_restaurant_outlined,
              message: l10n.noTables,
            );
          }

          final occupied = tables.where((t) => t.status == 'occupied').length;
          final available = tables.where((t) => t.status == 'available').length;

          return RefreshIndicator(
            onRefresh: () => ref.read(tablesNotifierProvider.notifier).refresh(),
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.md, AppSpacing.md, 0),
                    child: Row(
                      children: [
                        _SummaryChip(
                          label: l10n.tableAvailable,
                          count: available,
                          color: AppColors.success,
                        ),
                        AppSpacing.widthSm,
                        _SummaryChip(
                          label: l10n.tableOccupied,
                          count: occupied,
                          color: AppColors.error,
                        ),
                      ],
                    ),
                  ),
                ),
                SliverPadding(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 160,
                      childAspectRatio: 1.1,
                      crossAxisSpacing: AppSpacing.sm,
                      mainAxisSpacing: AppSpacing.sm,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => _TableCard(table: tables[index]),
                      childCount: tables.length,
                    ),
                  ),
                ),
              ],
            ),
          );
        },
        loading: () => const AppListSkeleton(),
        error: (err, stack) => AppErrorState(
          error: err,
          onRetry: () => ref.read(tablesNotifierProvider.notifier).refresh(),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showDialog<void>(
          context: context,
          builder: (ctx) => const TableEditDialog(),
        ),
        backgroundColor: AppColors.tealPrimary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}

class _SummaryChip extends StatelessWidget {
  final String label;
  final int count;
  final Color color;

  const _SummaryChip({required this.label, required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xxs),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
      ),
      child: Text(
        '$label: $count',
        style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 13),
      ),
    );
  }
}

class _TableCard extends ConsumerWidget {
  final TableModel table;

  const _TableCard({required this.table});

  Color _statusColor() {
    switch (table.status) {
      case 'occupied':
        return AppColors.error;
      case 'reserved':
        return AppColors.warning;
      case 'merged':
        return Colors.purple;
      default:
        return AppColors.success;
    }
  }

  String _statusLabel(AppLocalizations l10n) {
    switch (table.status) {
      case 'occupied':
        return l10n.tableOccupied;
      case 'reserved':
        return l10n.tableReserved;
      case 'merged':
        return l10n.tableMerged;
      default:
        return l10n.tableAvailable;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final color = _statusColor();

    return GestureDetector(
      onTap: () => _showActions(context, ref, l10n),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          border: Border.all(color: color.withValues(alpha: 0.5)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(AppSpacing.sm),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.table_restaurant, color: color, size: 32),
            AppSpacing.heightXs,
            Text(
              table.label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 2),
            Text(
              '${table.capacity} • ${_statusLabel(l10n)}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
    );
  }

  void _showActions(BuildContext context, WidgetRef ref, AppLocalizations l10n) {
    final notifier = ref.read(tablesNotifierProvider.notifier);

    Future<void> setStatus(String status) async {
      try {
        await notifier.updateStatus(table.id, status);
      } catch (e) {
        if (context.mounted) {
          showAppSnackBar(context, '$e', type: AppSnackBarType.error);
        }
      }
    }

    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusLg)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Text(
                table.label,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
              ),
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.check_circle_outline, color: AppColors.success),
              title: Text(l10n.tableAvailable),
              onTap: () {
                Navigator.pop(ctx);
                setStatus('available');
              },
            ),
            ListTile(
              leading: const Icon(Icons.people_outline, color: AppColors.error),
              title: Text(l10n.tableOccupied),
              onTap: () {
                Navigator.pop(ctx);
                setStatus('occupied');
              },
            ),
            ListTile(
              leading: const Icon(Icons.event_seat_outlined, color: AppColors.warning),
              title: Text(l10n.tableReserved),
              onTap: () {
                Navigator.pop(ctx);
                setStatus('reserved');
              },
            ),
            const Divider(height: 1),
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: Text(l10n.edit),
              onTap: () {
                Navigator.pop(ctx);
                showDialog<void>(
                  context: context,
                  builder: (dCtx) => TableEditDialog(table: table),
                );
              },
            ),
            ListTile(
              leading: const Icon(Icons.delete_outline, color: AppColors.error),
              title: Text(l10n.delete, style: const TextStyle(color: AppColors.error)),
              onTap: () async {
                Navigator.pop(ctx);
                try {
                  await notifier.deleteTable(table.id);
                } catch (e) {
                  if (context.mounted) {
                    showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                  }
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}

class TableEditDialog extends ConsumerStatefulWidget {
  final TableModel? table;

  const TableEditDialog({super.key, this.table});

  @override
  ConsumerState<TableEditDialog> createState() => _TableEditDialogState();
}

class _TableEditDialogState extends ConsumerState<TableEditDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _labelController;
  late final TextEditingController _capacityController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _labelController = TextEditingController(text: widget.table?.label ?? '');
    _capacityController = TextEditingController(text: (widget.table?.capacity ?? 4).toString());
  }

  @override
  void dispose() {
    _labelController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final notifier = ref.read(tablesNotifierProvider.notifier);
    final label = _labelController.text.trim();
    final capacity = int.tryParse(_capacityController.text.trim()) ?? 4;

    try {
      if (widget.table == null) {
        await notifier.addTable(label, capacity);
      } else {
        await notifier.updateTable(widget.table!.id, label, capacity);
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
      title: Text(widget.table == null ? l10n.addTable : l10n.edit),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _labelController,
              decoration: InputDecoration(labelText: l10n.tableLabel),
              validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
            ),
            AppSpacing.heightSm,
            TextFormField(
              controller: _capacityController,
              decoration: InputDecoration(labelText: l10n.capacity),
              keyboardType: TextInputType.number,
              validator: (v) => (v == null || int.tryParse(v.trim()) == null) ? l10n.fieldRequired : null,
            ),
          ],
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

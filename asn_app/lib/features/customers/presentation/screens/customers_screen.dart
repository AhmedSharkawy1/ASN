import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_search_field.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/customers/data/models/customer_model.dart';
import 'package:asn_app/features/customers/presentation/providers/customers_provider.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final customersAsync = ref.watch(customersNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.customers),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(customersNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: Column(
        children: [
          AppSearchField(onChanged: (value) => setState(() => _searchQuery = value)),
          Expanded(
            child: customersAsync.when(
              data: (customers) {
                var filtered = customers;
                if (_searchQuery.isNotEmpty) {
                  final q = _searchQuery.toLowerCase();
                  filtered = filtered
                      .where((c) =>
                          c.name.toLowerCase().contains(q) ||
                          (c.phone?.contains(q) ?? false) ||
                          (c.address?.toLowerCase().contains(q) ?? false))
                      .toList();
                }

                if (filtered.isEmpty) {
                  return AppEmptyState(
                    icon: Icons.people_outline,
                    message: l10n.noCustomers,
                  );
                }

                return RefreshIndicator(
                  onRefresh: () => ref.read(customersNotifierProvider.notifier).refresh(),
                  child: ListView.separated(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    itemCount: filtered.length,
                    separatorBuilder: (context, index) => AppSpacing.heightXs,
                    itemBuilder: (context, index) => _CustomerCard(customer: filtered[index]),
                  ),
                );
              },
              loading: () => const AppListSkeleton(),
              error: (err, stack) => AppErrorState(
                error: err,
                onRetry: () => ref.read(customersNotifierProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showDialog<void>(
          context: context,
          builder: (ctx) => const CustomerDialog(),
        ),
        backgroundColor: AppColors.tealPrimary,
        child: const Icon(Icons.person_add, color: Colors.white),
      ),
    );
  }
}

class _CustomerCard extends ConsumerWidget {
  final CustomerModel customer;

  const _CustomerCard({required this.customer});

  Widget _swipeBackground(BuildContext context, {required bool isDelete}) {
    return Container(
      decoration: BoxDecoration(
        color: (isDelete ? AppColors.error : AppColors.info).withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
      ),
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
      alignment: isDelete ? AlignmentDirectional.centerEnd : AlignmentDirectional.centerStart,
      child: Icon(
        isDelete ? Icons.delete_outline : Icons.edit_outlined,
        color: isDelete ? AppColors.error : AppColors.info,
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final notifier = ref.read(customersNotifierProvider.notifier);

    return Dismissible(
      key: ValueKey('customer-${customer.id}'),
      background: _swipeBackground(context, isDelete: false),
      secondaryBackground: _swipeBackground(context, isDelete: true),
      confirmDismiss: (direction) async {
        if (direction == DismissDirection.startToEnd) {
          // Swipe to edit
          await showDialog<void>(
            context: context,
            builder: (ctx) => CustomerDialog(customer: customer),
          );
          return false;
        }
        // Swipe to delete (with confirmation)
        final confirmed = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(l10n.deleteConfirmTitle),
            content: Text(customer.name),
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
            await notifier.deleteCustomer(customer.id);
          } catch (e) {
            if (context.mounted) showAppSnackBar(context, '$e', type: AppSnackBarType.error);
          }
        }
        // Provider refresh rebuilds the list; never let Dismissible remove the row itself
        return false;
      },
      child: _buildCard(context, ref, l10n, notifier),
    );
  }

  Widget _buildCard(BuildContext context, WidgetRef ref, AppLocalizations l10n, CustomersNotifier notifier) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.sm),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
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
            backgroundColor: AppColors.tealPrimary.withValues(alpha: 0.1),
            child: const Icon(Icons.person, color: AppColors.tealPrimary),
          ),
          AppSpacing.widthSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  customer.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                if (customer.phone?.isNotEmpty == true || customer.address?.isNotEmpty == true) ...[
                  const SizedBox(height: 2),
                  Text(
                    [
                      if (customer.phone?.isNotEmpty == true) customer.phone!,
                      if (customer.address?.isNotEmpty == true) customer.address!,
                    ].join(' • '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ],
            ),
          ),
          if (customer.phone?.isNotEmpty == true)
            IconButton(
              icon: const Icon(Icons.phone_outlined, color: AppColors.success),
              onPressed: () async {
                final uri = Uri(scheme: 'tel', path: customer.phone);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri);
                }
              },
            ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'edit') {
                await showDialog<void>(
                  context: context,
                  builder: (ctx) => CustomerDialog(customer: customer),
                );
              } else if (value == 'delete') {
                await showDialog<void>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: Text(l10n.deleteConfirmTitle),
                    content: Text(customer.name),
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
                            await notifier.deleteCustomer(customer.id);
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
}

class CustomerDialog extends ConsumerStatefulWidget {
  final CustomerModel? customer;

  const CustomerDialog({super.key, this.customer});

  @override
  ConsumerState<CustomerDialog> createState() => _CustomerDialogState();
}

class _CustomerDialogState extends ConsumerState<CustomerDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _addressController;
  late final TextEditingController _notesController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final customer = widget.customer;
    _nameController = TextEditingController(text: customer?.name ?? '');
    _phoneController = TextEditingController(text: customer?.phone ?? '');
    _addressController = TextEditingController(text: customer?.address ?? '');
    _notesController = TextEditingController(text: customer?.notes ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final notifier = ref.read(customersNotifierProvider.notifier);
    final name = _nameController.text.trim();
    String? valueOf(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();

    try {
      if (widget.customer == null) {
        await notifier.addCustomer(
          name: name,
          phone: valueOf(_phoneController),
          address: valueOf(_addressController),
          notes: valueOf(_notesController),
        );
      } else {
        await notifier.updateCustomer(
          customerId: widget.customer!.id,
          name: name,
          phone: valueOf(_phoneController),
          address: valueOf(_addressController),
          notes: valueOf(_notesController),
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
      title: Text(widget.customer == null ? l10n.addCustomer : l10n.edit),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(labelText: l10n.customerName),
                validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _phoneController,
                decoration: InputDecoration(labelText: l10n.customerPhone),
                keyboardType: TextInputType.phone,
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _addressController,
                decoration: InputDecoration(labelText: l10n.customerAddress),
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

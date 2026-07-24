import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/promotions/data/models/promotion_model.dart';
import 'package:asn_app/features/promotions/presentation/providers/promotions_provider.dart';

class PromotionsScreen extends ConsumerWidget {
  const PromotionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final promosAsync = ref.watch(promotionsNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.promotions),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(promotionsNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: promosAsync.when(
        data: (promos) {
          if (promos.isEmpty) {
            return AppEmptyState(
              icon: Icons.local_offer_outlined,
              message: l10n.noPromotions,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(promotionsNotifierProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: promos.length,
              separatorBuilder: (context, index) => AppSpacing.heightXs,
              itemBuilder: (context, index) => _PromotionCard(promo: promos[index]),
            ),
          );
        },
        loading: () => const AppListSkeleton(),
        error: (err, stack) => AppErrorState(
          error: err,
          onRetry: () => ref.read(promotionsNotifierProvider.notifier).refresh(),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showDialog<void>(
          context: context,
          builder: (ctx) => const PromotionDialog(),
        ),
        backgroundColor: AppColors.tealPrimary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}

class _PromotionCard extends ConsumerWidget {
  final PromotionModel promo;

  const _PromotionCard({required this.promo});

  String _discountLabel(AppLocalizations l10n) {
    switch (promo.discountType) {
      case 'percentage':
        return '${promo.discountValue.toStringAsFixed(0)}%';
      case 'free_shipping':
        return l10n.freeShipping;
      default:
        return promo.discountValue.toStringAsFixed(0);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final notifier = ref.read(promotionsNotifierProvider.notifier);
    final expired = promo.isExpired;

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
            backgroundColor:
                (promo.isActive && !expired ? AppColors.warning : Colors.grey).withValues(alpha: 0.12),
            child: Icon(
              Icons.local_offer,
              color: promo.isActive && !expired ? AppColors.warning : Colors.grey,
              size: 20,
            ),
          ),
          AppSpacing.widthSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  promo.localizedName(isArabic),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  '${l10n.discount}: ${_discountLabel(l10n)}'
                  '${promo.minOrderAmount > 0 ? ' • ${l10n.minOrder}: ${promo.minOrderAmount.toStringAsFixed(0)}' : ''}'
                  '${expired ? ' • ${l10n.expired}' : ''}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: expired ? AppColors.error : Colors.grey,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: promo.isActive,
            activeThumbColor: AppColors.tealPrimary,
            onChanged: (_) async {
              try {
                await notifier.toggleActive(promo.id, promo.isActive);
              } catch (e) {
                if (context.mounted) {
                  showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                }
              }
            },
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'edit') {
                await showDialog<void>(
                  context: context,
                  builder: (ctx) => PromotionDialog(promo: promo),
                );
              } else if (value == 'delete') {
                try {
                  await notifier.deletePromotion(promo.id);
                } catch (e) {
                  if (context.mounted) {
                    showAppSnackBar(context, '$e', type: AppSnackBarType.error);
                  }
                }
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

class PromotionDialog extends ConsumerStatefulWidget {
  final PromotionModel? promo;

  const PromotionDialog({super.key, this.promo});

  @override
  ConsumerState<PromotionDialog> createState() => _PromotionDialogState();
}

class _PromotionDialogState extends ConsumerState<PromotionDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameArController;
  late final TextEditingController _nameEnController;
  late final TextEditingController _descArController;
  late final TextEditingController _valueController;
  late final TextEditingController _minOrderController;
  late String _discountType;
  DateTime? _startsAt;
  DateTime? _endsAt;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final promo = widget.promo;
    _nameArController = TextEditingController(text: promo?.nameAr ?? '');
    _nameEnController = TextEditingController(text: promo?.nameEn ?? '');
    _descArController = TextEditingController(text: promo?.descriptionAr ?? '');
    _valueController = TextEditingController(text: promo != null ? promo.discountValue.toStringAsFixed(0) : '');
    _minOrderController = TextEditingController(text: promo != null ? promo.minOrderAmount.toStringAsFixed(0) : '0');
    _discountType = promo?.discountType ?? 'fixed_amount';
    _startsAt = promo?.startsAt;
    _endsAt = promo?.endsAt;
  }

  @override
  void dispose() {
    _nameArController.dispose();
    _nameEnController.dispose();
    _descArController.dispose();
    _valueController.dispose();
    _minOrderController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isStart) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: (isStart ? _startsAt : _endsAt) ?? now,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 3),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startsAt = picked;
        } else {
          _endsAt = picked;
        }
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final notifier = ref.read(promotionsNotifierProvider.notifier);
    final nameAr = _nameArController.text.trim();
    final nameEn = _nameEnController.text.trim().isEmpty ? null : _nameEnController.text.trim();
    final descAr = _descArController.text.trim().isEmpty ? null : _descArController.text.trim();
    final value = _discountType == 'free_shipping' ? 0.0 : (double.tryParse(_valueController.text.trim()) ?? 0);
    final minOrder = double.tryParse(_minOrderController.text.trim()) ?? 0;

    try {
      if (widget.promo == null) {
        await notifier.addPromotion(
          nameAr: nameAr,
          nameEn: nameEn,
          descriptionAr: descAr,
          discountType: _discountType,
          discountValue: value,
          minOrderAmount: minOrder,
          startsAt: _startsAt,
          endsAt: _endsAt,
        );
      } else {
        await notifier.updatePromotion(
          promoId: widget.promo!.id,
          nameAr: nameAr,
          nameEn: nameEn,
          descriptionAr: descAr,
          discountType: _discountType,
          discountValue: value,
          minOrderAmount: minOrder,
          startsAt: _startsAt,
          endsAt: _endsAt,
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
    final dateFormat = DateFormat('yyyy-MM-dd');

    return AlertDialog(
      title: Text(widget.promo == null ? l10n.addPromotion : l10n.edit),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameArController,
                decoration: InputDecoration(labelText: l10n.nameArabic),
                validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _nameEnController,
                decoration: InputDecoration(labelText: l10n.nameEnglish),
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _descArController,
                decoration: InputDecoration(labelText: l10n.description),
                maxLines: 2,
              ),
              AppSpacing.heightSm,
              DropdownButtonFormField<String>(
                initialValue: _discountType,
                decoration: InputDecoration(labelText: l10n.discountType),
                items: [
                  DropdownMenuItem(value: 'fixed_amount', child: Text(l10n.fixedAmount)),
                  DropdownMenuItem(value: 'percentage', child: Text(l10n.percentage)),
                  DropdownMenuItem(value: 'free_shipping', child: Text(l10n.freeShipping)),
                ],
                onChanged: (v) => setState(() => _discountType = v ?? 'fixed_amount'),
              ),
              if (_discountType != 'free_shipping') ...[
                AppSpacing.heightSm,
                TextFormField(
                  controller: _valueController,
                  decoration: InputDecoration(labelText: l10n.discountValue),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  validator: (v) {
                    if (_discountType == 'free_shipping') return null;
                    return (v == null || double.tryParse(v.trim()) == null) ? l10n.fieldRequired : null;
                  },
                ),
              ],
              AppSpacing.heightSm,
              TextFormField(
                controller: _minOrderController,
                decoration: InputDecoration(labelText: l10n.minOrder),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              AppSpacing.heightSm,
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.calendar_today, size: 16),
                      label: Text(
                        _startsAt != null ? dateFormat.format(_startsAt!) : l10n.startDate,
                        style: const TextStyle(fontSize: 12),
                      ),
                      onPressed: () => _pickDate(true),
                    ),
                  ),
                  AppSpacing.widthXs,
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.event, size: 16),
                      label: Text(
                        _endsAt != null ? dateFormat.format(_endsAt!) : l10n.endDate,
                        style: const TextStyle(fontSize: 12),
                      ),
                      onPressed: () => _pickDate(false),
                    ),
                  ),
                ],
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

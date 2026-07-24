import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/delivery/data/models/delivery_zone_model.dart';
import 'package:asn_app/features/delivery/presentation/providers/delivery_zones_provider.dart';

class DeliveryZonesScreen extends ConsumerWidget {
  const DeliveryZonesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final zonesAsync = ref.watch(deliveryZonesNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.delivery),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(deliveryZonesNotifierProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: zonesAsync.when(
        data: (zones) {
          if (zones.isEmpty) {
            return AppEmptyState(
              icon: Icons.delivery_dining_outlined,
              message: l10n.noDeliveryZones,
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(deliveryZonesNotifierProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: zones.length,
              separatorBuilder: (context, index) => AppSpacing.heightXs,
              itemBuilder: (context, index) => _ZoneCard(zone: zones[index]),
            ),
          );
        },
        loading: () => const AppListSkeleton(),
        error: (err, stack) => AppErrorState(
          error: err,
          onRetry: () => ref.read(deliveryZonesNotifierProvider.notifier).refresh(),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => showDialog<void>(
          context: context,
          builder: (ctx) => const DeliveryZoneDialog(),
        ),
        backgroundColor: AppColors.tealPrimary,
        child: const Icon(Icons.add, color: Colors.white),
      ),
    );
  }
}

class _ZoneCard extends ConsumerWidget {
  final DeliveryZoneModel zone;

  const _ZoneCard({required this.zone});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final isArabic = Localizations.localeOf(context).languageCode == 'ar';
    final notifier = ref.read(deliveryZonesNotifierProvider.notifier);

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
                (zone.isActive ? AppColors.tealPrimary : Colors.grey).withValues(alpha: 0.1),
            child: Icon(
              Icons.location_on_outlined,
              color: zone.isActive ? AppColors.tealPrimary : Colors.grey,
              size: 20,
            ),
          ),
          AppSpacing.widthSm,
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  zone.localizedName(isArabic),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
                const SizedBox(height: 2),
                Text(
                  '${l10n.deliveryFee}: ${zone.fee.toStringAsFixed(0)} • '
                  '${l10n.minOrder}: ${zone.minOrder.toStringAsFixed(0)} • '
                  '${zone.estimatedTime} ${l10n.minutesShort}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
              ],
            ),
          ),
          Switch(
            value: zone.isActive,
            activeThumbColor: AppColors.tealPrimary,
            onChanged: (_) async {
              try {
                await notifier.toggleActive(zone.id, zone.isActive);
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
                  builder: (ctx) => DeliveryZoneDialog(zone: zone),
                );
              } else if (value == 'delete') {
                try {
                  await notifier.deleteZone(zone.id);
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

class DeliveryZoneDialog extends ConsumerStatefulWidget {
  final DeliveryZoneModel? zone;

  const DeliveryZoneDialog({super.key, this.zone});

  @override
  ConsumerState<DeliveryZoneDialog> createState() => _DeliveryZoneDialogState();
}

class _DeliveryZoneDialogState extends ConsumerState<DeliveryZoneDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameArController;
  late final TextEditingController _nameEnController;
  late final TextEditingController _feeController;
  late final TextEditingController _minOrderController;
  late final TextEditingController _timeController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final zone = widget.zone;
    _nameArController = TextEditingController(text: zone?.nameAr ?? '');
    _nameEnController = TextEditingController(text: zone?.nameEn ?? '');
    _feeController = TextEditingController(text: zone != null ? zone.fee.toStringAsFixed(0) : '');
    _minOrderController = TextEditingController(text: zone != null ? zone.minOrder.toStringAsFixed(0) : '');
    _timeController = TextEditingController(text: (zone?.estimatedTime ?? 30).toString());
  }

  @override
  void dispose() {
    _nameArController.dispose();
    _nameEnController.dispose();
    _feeController.dispose();
    _minOrderController.dispose();
    _timeController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);

    final notifier = ref.read(deliveryZonesNotifierProvider.notifier);
    final nameAr = _nameArController.text.trim();
    final nameEn = _nameEnController.text.trim().isEmpty ? null : _nameEnController.text.trim();
    final fee = double.tryParse(_feeController.text.trim()) ?? 0;
    final minOrder = double.tryParse(_minOrderController.text.trim()) ?? 0;
    final time = int.tryParse(_timeController.text.trim()) ?? 30;

    try {
      if (widget.zone == null) {
        await notifier.addZone(
          nameAr: nameAr,
          nameEn: nameEn,
          fee: fee,
          minOrder: minOrder,
          estimatedTime: time,
        );
      } else {
        await notifier.updateZone(
          zoneId: widget.zone!.id,
          nameAr: nameAr,
          nameEn: nameEn,
          fee: fee,
          minOrder: minOrder,
          estimatedTime: time,
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
      title: Text(widget.zone == null ? l10n.addZone : l10n.edit),
      content: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _nameArController,
                decoration: InputDecoration(labelText: l10n.zoneNameAr),
                validator: (v) => (v == null || v.trim().isEmpty) ? l10n.fieldRequired : null,
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _nameEnController,
                decoration: InputDecoration(labelText: l10n.zoneNameEn),
              ),
              AppSpacing.heightSm,
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _feeController,
                      decoration: InputDecoration(labelText: l10n.deliveryFee),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      validator: (v) => (v == null || double.tryParse(v.trim()) == null) ? l10n.fieldRequired : null,
                    ),
                  ),
                  AppSpacing.widthSm,
                  Expanded(
                    child: TextFormField(
                      controller: _minOrderController,
                      decoration: InputDecoration(labelText: l10n.minOrder),
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                ],
              ),
              AppSpacing.heightSm,
              TextFormField(
                controller: _timeController,
                decoration: InputDecoration(labelText: l10n.estimatedTimeMin),
                keyboardType: TextInputType.number,
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

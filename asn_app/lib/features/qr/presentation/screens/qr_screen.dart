import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/shared/presentation/widgets/app_navigation_drawer.dart';
import 'package:asn_app/shared/presentation/widgets/app_snackbar.dart';
import 'package:asn_app/shared/presentation/widgets/state_widgets.dart';
import 'package:asn_app/features/qr/presentation/providers/qr_provider.dart';
import 'package:asn_app/features/tables/data/models/table_model.dart';
import 'package:asn_app/features/tables/presentation/providers/tables_provider.dart';

class QrScreen extends ConsumerStatefulWidget {
  const QrScreen({super.key});

  @override
  ConsumerState<QrScreen> createState() => _QrScreenState();
}

class _QrScreenState extends ConsumerState<QrScreen> {
  /// null = whole-menu QR; otherwise a specific table id.
  String? _selectedTableId;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final qrAsync = ref.watch(qrInfoProvider);
    final tables = ref.watch(tablesNotifierProvider).value ?? const <TableModel>[];

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.qrTitle),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(qrInfoProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: qrAsync.when(
        data: (info) {
          final url = info.menuUrl(tableId: _selectedTableId);
          final selectedTable =
              tables.where((t) => t.id == _selectedTableId).firstOrNull;

          return LayoutBuilder(
            builder: (context, constraints) {
              final qrSize = (constraints.maxWidth * 0.6).clamp(180.0, 300.0);
              return SingleChildScrollView(
                padding: const EdgeInsets.all(AppSpacing.lg),
                child: Column(
                  children: [
                    // Table selector chips (whole menu + each table)
                    if (tables.isNotEmpty) ...[
                      SizedBox(
                        height: 44,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            Padding(
                              padding: const EdgeInsetsDirectional.only(end: AppSpacing.xs),
                              child: ChoiceChip(
                                label: Text(l10n.wholeMenu),
                                selected: _selectedTableId == null,
                                selectedColor: AppColors.tealPrimary.withValues(alpha: 0.15),
                                onSelected: (_) => setState(() => _selectedTableId = null),
                              ),
                            ),
                            ...tables.map(
                              (t) => Padding(
                                padding: const EdgeInsetsDirectional.only(end: AppSpacing.xs),
                                child: ChoiceChip(
                                  label: Text(t.label),
                                  selected: _selectedTableId == t.id,
                                  selectedColor: AppColors.tealPrimary.withValues(alpha: 0.15),
                                  onSelected: (_) => setState(() => _selectedTableId = t.id),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      AppSpacing.heightLg,
                    ],

                    // QR card — always white so it scans in dark mode too
                    Container(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                        boxShadow: AppColors.shadowOf(context),
                      ),
                      child: Column(
                        children: [
                          Text(
                            _selectedTableId == null
                                ? l10n.menuQr
                                : '${l10n.tableQr} — ${selectedTable?.label ?? ''}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                              color: AppColors.lightTextPrimary,
                            ),
                          ),
                          AppSpacing.heightMd,
                          QrImageView(
                            data: url,
                            version: QrVersions.auto,
                            size: qrSize.toDouble(),
                            gapless: false,
                            // ignore: deprecated_member_use
                            foregroundColor: AppColors.lightTextPrimary,
                            errorCorrectionLevel: QrErrorCorrectLevel.H,
                          ),
                          AppSpacing.heightMd,
                          Text(
                            l10n.scanToOrder,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 12,
                              color: AppColors.lightTextSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    AppSpacing.heightLg,

                    // The URL itself
                    SelectableText(
                      url,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    AppSpacing.heightMd,

                    // Actions
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.copy, size: 18),
                            label: Text(l10n.copyLink),
                            onPressed: () async {
                              await Clipboard.setData(ClipboardData(text: url));
                              if (context.mounted) {
                                showAppSnackBar(context, l10n.linkCopied,
                                    type: AppSnackBarType.success);
                              }
                            },
                          ),
                        ),
                        AppSpacing.widthSm,
                        Expanded(
                          child: ElevatedButton.icon(
                            icon: const Icon(Icons.open_in_new, size: 18),
                            label: Text(l10n.openMenu),
                            onPressed: () async {
                              final uri = Uri.parse(url);
                              if (await canLaunchUrl(uri)) {
                                await launchUrl(uri, mode: LaunchMode.externalApplication);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    AppSpacing.heightLg,
                  ],
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => AppErrorState(
          error: err,
          onRetry: () => ref.read(qrInfoProvider.notifier).refresh(),
        ),
      ),
    );
  }
}

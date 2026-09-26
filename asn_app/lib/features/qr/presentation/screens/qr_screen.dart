import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:gal/gal.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:asn_app/core/localization/l10n/app_localizations.dart';
import 'package:asn_app/core/logging/logger.dart';
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
  bool _isDownloading = false;
  final GlobalKey _qrCardKey = GlobalKey();

  Future<void> _downloadQr(
    BuildContext context,
    bool isAr,
    String url,
    String label,
  ) async {
    if (_isDownloading) return;
    setState(() => _isDownloading = true);

    try {
      Uint8List? pngBytes;

      // Attempt 1: Capture the high-res QR card widget from RepaintBoundary
      try {
        final boundary =
            _qrCardKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
        if (boundary != null) {
          final image = await boundary.toImage(pixelRatio: 3.0);
          final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
          pngBytes = byteData?.buffer.asUint8List();
        }
      } catch (e) {
        AppLogger.warning(
          'RepaintBoundary capture failed, falling back to QrPainter: $e',
          name: 'QR',
        );
      }

      // Attempt 2: High-res QrPainter fallback if widget capture fails
      if (pngBytes == null) {
        final painter = QrPainter(
          data: url,
          version: QrVersions.auto,
          gapless: false,
          eyeStyle: const QrEyeStyle(
            eyeShape: QrEyeShape.square,
            color: Color(0xFF16202B),
          ),
          dataModuleStyle: const QrDataModuleStyle(
            dataModuleShape: QrDataModuleShape.square,
            color: Color(0xFF16202B),
          ),
          errorCorrectionLevel: QrErrorCorrectLevel.H,
        );
        final picData =
            await painter.toImageData(1024, format: ui.ImageByteFormat.png);
        pngBytes = picData?.buffer.asUint8List();
      }

      if (pngBytes == null) {
        throw Exception(isAr ? 'فشل إنشاء صورة الرمز' : 'Failed to generate QR image');
      }

      // Permission check
      final hasAccess = await Gal.hasAccess();
      if (!hasAccess) {
        final granted = await Gal.requestAccess();
        if (!granted) {
          if (context.mounted) {
            showAppSnackBar(
              context,
              isAr
                  ? 'يرجى منح إذن التخزين لحفظ رمز QR في معرض الصور'
                  : 'Please grant storage permission to save QR to gallery',
              type: AppSnackBarType.error,
            );
          }
          return;
        }
      }

      // Save to device photo gallery
      final cleanLabel =
          label.replaceAll(RegExp(r'[^a-zA-Z0-9_\u0600-\u06FF]'), '_');
      final fileName = 'ASN_QR_${cleanLabel}_${DateTime.now().millisecondsSinceEpoch}';

      await Gal.putImageBytes(
        pngBytes,
        name: fileName,
      );

      if (context.mounted) {
        showAppSnackBar(
          context,
          isAr
              ? 'تم تحميل وحفظ رمز QR بنجاح في معرض الصور (Gallery)'
              : 'QR code saved to gallery successfully!',
          type: AppSnackBarType.success,
        );
      }
    } catch (e) {
      if (context.mounted) {
        showAppSnackBar(
          context,
          isAr ? 'تعذر حفظ رمز QR: $e' : 'Failed to save QR code: $e',
          type: AppSnackBarType.error,
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isDownloading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isAr = Localizations.localeOf(context).languageCode == 'ar';
    final qrAsync = ref.watch(qrInfoProvider);
    final tables = ref.watch(tablesNotifierProvider).value ?? const <TableModel>[];

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.qrTitle),
        actions: [
          qrAsync.maybeWhen(
            data: (info) {
              final selectedTable =
                  tables.where((t) => t.id == _selectedTableId).firstOrNull;
              final url = info.menuUrl(
                tableId: _selectedTableId,
                tableLabel: selectedTable?.label,
              );
              final currentLabel = _selectedTableId == null
                  ? (isAr ? 'المنيو_الرئيسي' : 'Main_Menu')
                  : (selectedTable?.label ?? 'Table');

              return IconButton(
                icon: _isDownloading
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : const Icon(Icons.file_download_outlined),
                tooltip: isAr ? 'تحميل رمز QR' : 'Download QR Code',
                onPressed: _isDownloading
                    ? null
                    : () => _downloadQr(context, isAr, url, currentLabel),
              );
            },
            orElse: () => const SizedBox.shrink(),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: isAr ? 'تحديث' : 'Refresh',
            onPressed: () => ref.read(qrInfoProvider.notifier).refresh(),
          ),
        ],
      ),
      drawer: const AppNavigationDrawer(),
      body: qrAsync.when(
        data: (info) {
          final selectedTable =
              tables.where((t) => t.id == _selectedTableId).firstOrNull;
          final url = info.menuUrl(
            tableId: _selectedTableId,
            tableLabel: selectedTable?.label,
          );
          final currentLabel = _selectedTableId == null
              ? (isAr ? 'المنيو_الرئيسي' : 'Main_Menu')
              : (selectedTable?.label ?? 'Table');

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

                    // QR card — wrapped in RepaintBoundary for high-res image capture and download
                    RepaintBoundary(
                      key: _qrCardKey,
                      child: Container(
                        padding: const EdgeInsets.all(AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                          boxShadow: AppColors.shadowOf(context),
                        ),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    _selectedTableId == null
                                        ? l10n.menuQr
                                        : '${l10n.tableQr} — ${selectedTable?.label ?? ''}',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 16,
                                      color: AppColors.lightTextPrimary,
                                    ),
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(
                                    Icons.file_download_outlined,
                                    color: AppColors.oceanBlue,
                                    size: 22,
                                  ),
                                  tooltip: isAr ? 'تحميل الرمز' : 'Download QR',
                                  onPressed: _isDownloading
                                      ? null
                                      : () => _downloadQr(
                                            context,
                                            isAr,
                                            url,
                                            currentLabel,
                                          ),
                                ),
                              ],
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
                    ),
                    AppSpacing.heightLg,

                    // The canonical URL itself
                    SelectableText(
                      url,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                    AppSpacing.heightLg,

                    // Primary Download Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton.icon(
                        icon: _isDownloading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Icon(Icons.file_download_outlined, size: 22),
                        label: Text(
                          isAr ? 'تحميل رمز QR على الهاتف' : 'Download QR Image',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.oceanBlue,
                          foregroundColor: Colors.white,
                          elevation: 2,
                          shadowColor: AppColors.oceanBlue.withValues(alpha: 0.35),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                          ),
                        ),
                        onPressed: _isDownloading
                            ? null
                            : () => _downloadQr(
                                  context,
                                  isAr,
                                  url,
                                  currentLabel,
                                ),
                      ),
                    ),
                    AppSpacing.heightMd,

                    // Additional Actions (Copy Link & Open Menu)
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.copy_rounded, size: 18),
                            label: Text(l10n.copyLink),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.oceanBlue,
                              side: BorderSide(
                                color: AppColors.oceanBlue.withValues(alpha: 0.35),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                              ),
                            ),
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
                          child: OutlinedButton.icon(
                            icon: const Icon(Icons.open_in_new_rounded, size: 18),
                            label: Text(l10n.openMenu),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: AppColors.oceanBlue,
                              side: BorderSide(
                                color: AppColors.oceanBlue.withValues(alpha: 0.35),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                              ),
                            ),
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

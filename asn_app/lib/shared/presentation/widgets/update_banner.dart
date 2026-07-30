import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:asn_app/core/services/app_update_service.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

/// A dismissible strip offering the newer build published on Google Play.
///
/// Never blocks anything: the app is fully usable while the download runs and
/// while it sits waiting, and dismissing keeps it quiet for a day so it cannot
/// nag someone through a shift.
class UpdateBanner extends StatefulWidget {
  const UpdateBanner({super.key});

  @override
  State<UpdateBanner> createState() => _UpdateBannerState();
}

class _UpdateBannerState extends State<UpdateBanner> {
  static const String _snoozeKey = 'update_banner_snoozed_until';
  static const Duration _snooze = Duration(days: 1);

  bool _visible = false;
  bool _downloading = false;
  bool _readyToInstall = false;

  @override
  void initState() {
    super.initState();
    _check();
  }

  Future<void> _check() async {
    if (await _isSnoozed()) return;

    final result = await AppUpdateService.check();
    if (!mounted || result != UpdateCheck.available) return;

    setState(() {
      _visible = true;
      _readyToInstall = AppUpdateService.downloadReady;
    });
  }

  Future<bool> _isSnoozed() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final until = prefs.getInt(_snoozeKey);
      if (until == null) return false;
      return DateTime.now().millisecondsSinceEpoch < until;
    } catch (_) {
      // A preferences failure must not stop the offer appearing.
      return false;
    }
  }

  Future<void> _dismiss() async {
    setState(() => _visible = false);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(
        _snoozeKey,
        DateTime.now().add(_snooze).millisecondsSinceEpoch,
      );
    } catch (_) {
      // Worst case it offers again next launch, which is harmless.
    }
  }

  Future<void> _download() async {
    setState(() => _downloading = true);
    final started = await AppUpdateService.startDownload();
    if (!mounted) return;
    setState(() {
      _downloading = false;
      // Play reports success once the download finishes, so the next step is
      // the restart.
      _readyToInstall = started;
      _visible = started;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_visible) return const SizedBox.shrink();

    final theme = Theme.of(context);
    return Material(
      color: AppColors.oceanBlue.withValues(alpha: 0.10),
      child: Padding(
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md, vertical: AppSpacing.xs),
        child: Row(
          children: [
            const Icon(Icons.system_update, size: 20, color: AppColors.oceanBlue),
            AppSpacing.widthSm,
            Expanded(
              child: Text(
                _readyToInstall
                    ? 'التحديث جاهز — أعد التشغيل لتثبيته'
                    : 'يوجد تحديث جديد للتطبيق',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppColors.oceanBlue,
                ),
              ),
            ),
            if (_downloading)
              const SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            else
              TextButton(
                onPressed: _readyToInstall
                    ? AppUpdateService.installDownloaded
                    : _download,
                child: Text(_readyToInstall ? 'إعادة التشغيل' : 'تحديث'),
              ),
            IconButton(
              icon: const Icon(Icons.close, size: 18),
              tooltip: 'لاحقاً',
              onPressed: _dismiss,
            ),
          ],
        ),
      ),
    );
  }
}

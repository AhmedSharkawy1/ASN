import 'package:flutter/material.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

enum AppSnackBarType { success, error, info }

/// Standardized feedback snackbars: colored accent icon + floating rounded bar.
void showAppSnackBar(
  BuildContext context,
  String message, {
  AppSnackBarType type = AppSnackBarType.info,
}) {
  final (color, icon) = switch (type) {
    AppSnackBarType.success => (AppColors.success, Icons.check_circle_rounded),
    AppSnackBarType.error => (AppColors.error, Icons.error_rounded),
    AppSnackBarType.info => (AppColors.info, Icons.info_rounded),
  };

  ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(icon, color: color, size: 20),
            AppSpacing.widthSm,
            Expanded(
              child: Text(message, maxLines: 3, overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
        duration: const Duration(seconds: 3),
      ),
    );
}

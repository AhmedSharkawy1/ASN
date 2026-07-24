import 'package:flutter/material.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

/// Standard content card: soft shadow, rounded corners, optional accent
/// border and tap ripple. The building block for all list rows.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final Color? accentColor;
  final VoidCallback? onTap;

  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.sm),
    this.accentColor,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final card = Ink(
      padding: onTap == null ? padding : EdgeInsets.zero,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: accentColor != null
            ? Border.all(color: accentColor!.withValues(alpha: 0.5))
            : null,
      ),
      child: onTap == null ? child : Padding(padding: padding, child: child),
    );

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        boxShadow: AppColors.shadowOf(context),
      ),
      child: onTap == null
          ? card
          : Material(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              clipBehavior: Clip.antiAlias,
              child: InkWell(onTap: onTap, child: card),
            ),
    );
  }
}

/// Circular tinted icon badge used at the start of list rows.
class AppIconBadge extends StatelessWidget {
  final IconData icon;
  final Color color;
  final double radius;

  const AppIconBadge({super.key, required this.icon, required this.color, this.radius = 20});

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: radius,
      backgroundColor: color.withValues(alpha: 0.12),
      child: Icon(icon, color: color, size: radius),
    );
  }
}

/// Small rounded status pill (Active / Occupied / Low stock ...).
class AppStatusPill extends StatelessWidget {
  final String label;
  final Color color;

  const AppStatusPill({super.key, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xs, vertical: AppSpacing.xxs),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
      ),
      child: Text(
        label,
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800),
      ),
    );
  }
}

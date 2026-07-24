import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/core/theme/app_theme_ext.dart';

/// A frosted Liquid Glass surface: blurred backdrop, translucent fill,
/// hairline border and a faint lit top edge.
///
/// Blur is the expensive part, so [blurEnabled] lets callers drop to a plain
/// translucent fill inside long scrolling lists where per-row `BackdropFilter`
/// would wreck frame times.
class GlassContainer extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double borderRadius;
  final double? blur;
  final Color? tint;
  final bool blurEnabled;
  final bool showHighlight;
  final VoidCallback? onTap;

  const GlassContainer({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.margin,
    this.borderRadius = AppSpacing.radiusLg,
    this.blur,
    this.tint,
    this.blurEnabled = true,
    this.showHighlight = true,
    this.onTap,
  });

  /// Cheaper variant for list rows — same look, no backdrop blur.
  const GlassContainer.flat({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpacing.md),
    this.margin,
    this.borderRadius = AppSpacing.radiusLg,
    this.tint,
    this.showHighlight = false,
    this.onTap,
  })  : blur = null,
        blurEnabled = false;

  @override
  Widget build(BuildContext context) {
    final glass = AppGlass.of(context);
    final radius = BorderRadius.circular(borderRadius);
    final fill = tint ?? glass.card;

    Widget surface = DecoratedBox(
      decoration: BoxDecoration(
        color: fill,
        borderRadius: radius,
        border: Border.all(color: glass.border, width: 1),
        // Faint highlight along the top edge — reads as light catching glass.
        gradient: showHighlight
            ? LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [glass.highlight, Colors.transparent],
                stops: const [0.0, 0.45],
              )
            : null,
      ),
      child: Padding(padding: padding, child: child),
    );

    if (onTap != null) {
      surface = Stack(
        children: [
          surface,
          Positioned.fill(
            child: Material(
              color: Colors.transparent,
              child: InkWell(onTap: onTap, borderRadius: radius),
            ),
          ),
        ],
      );
    }

    Widget content = ClipRRect(
      borderRadius: radius,
      child: blurEnabled
          ? BackdropFilter(
              filter: ImageFilter.blur(
                sigmaX: blur ?? glass.blur,
                sigmaY: blur ?? glass.blur,
              ),
              child: surface,
            )
          : surface,
    );

    content = DecoratedBox(
      decoration: BoxDecoration(borderRadius: radius, boxShadow: glass.shadow),
      child: content,
    );

    return margin == null ? content : Padding(padding: margin!, child: content);
  }
}

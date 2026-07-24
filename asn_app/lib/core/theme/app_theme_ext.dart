import 'package:flutter/material.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

/// Liquid Glass design tokens that don't map onto ThemeData's standard slots.
class AppGlass extends ThemeExtension<AppGlass> {
  /// Fill of a floating glass panel (nav bar, sheets, dialogs).
  final Color surface;

  /// Fill of a glass card sitting on the background.
  final Color card;

  /// Hairline translucent border.
  final Color border;

  /// Faint top highlight that gives glass its "lit edge".
  final Color highlight;

  final double blur;
  final List<BoxShadow> shadow;

  const AppGlass({
    required this.surface,
    required this.card,
    required this.border,
    required this.highlight,
    required this.blur,
    required this.shadow,
  });

  static AppGlass light = AppGlass(
    surface: AppColors.glassSurfaceLight,
    card: AppColors.glassCardLight,
    border: AppColors.glassBorderLight,
    highlight: Colors.white.withValues(alpha: 0.40),
    blur: AppSpacing.blurSoft,
    shadow: AppColors.softShadow,
  );

  static AppGlass dark = AppGlass(
    surface: AppColors.glassSurfaceDark,
    card: AppColors.glassCardDark,
    border: AppColors.glassBorderDark,
    highlight: Colors.white.withValues(alpha: 0.05),
    blur: AppSpacing.blurSoft,
    shadow: AppColors.darkShadow,
  );

  static AppGlass of(BuildContext context) =>
      Theme.of(context).extension<AppGlass>() ??
      (Theme.of(context).brightness == Brightness.dark ? dark : light);

  @override
  AppGlass copyWith({
    Color? surface,
    Color? card,
    Color? border,
    Color? highlight,
    double? blur,
    List<BoxShadow>? shadow,
  }) {
    return AppGlass(
      surface: surface ?? this.surface,
      card: card ?? this.card,
      border: border ?? this.border,
      highlight: highlight ?? this.highlight,
      blur: blur ?? this.blur,
      shadow: shadow ?? this.shadow,
    );
  }

  @override
  AppGlass lerp(ThemeExtension<AppGlass>? other, double t) {
    if (other is! AppGlass) return this;
    return AppGlass(
      surface: Color.lerp(surface, other.surface, t) ?? surface,
      card: Color.lerp(card, other.card, t) ?? card,
      border: Color.lerp(border, other.border, t) ?? border,
      highlight: Color.lerp(highlight, other.highlight, t) ?? highlight,
      blur: (blur + (other.blur - blur) * t),
      shadow: t < 0.5 ? shadow : other.shadow,
    );
  }
}

/// Kept for existing call sites; now backed by the glass tokens.
class AppSurfaces extends ThemeExtension<AppSurfaces> {
  final List<BoxShadow> cardShadow;
  final Color glassTint;
  final Color glassBorder;

  const AppSurfaces({
    required this.cardShadow,
    required this.glassTint,
    required this.glassBorder,
  });

  static AppSurfaces light = AppSurfaces(
    cardShadow: AppColors.softShadow,
    glassTint: AppColors.glassSurfaceLight,
    glassBorder: AppColors.glassBorderLight,
  );

  static AppSurfaces dark = AppSurfaces(
    cardShadow: AppColors.darkShadow,
    glassTint: AppColors.glassSurfaceDark,
    glassBorder: AppColors.glassBorderDark,
  );

  static AppSurfaces of(BuildContext context) =>
      Theme.of(context).extension<AppSurfaces>() ??
      (Theme.of(context).brightness == Brightness.dark ? dark : light);

  @override
  AppSurfaces copyWith({List<BoxShadow>? cardShadow, Color? glassTint, Color? glassBorder}) {
    return AppSurfaces(
      cardShadow: cardShadow ?? this.cardShadow,
      glassTint: glassTint ?? this.glassTint,
      glassBorder: glassBorder ?? this.glassBorder,
    );
  }

  @override
  AppSurfaces lerp(ThemeExtension<AppSurfaces>? other, double t) {
    if (other is! AppSurfaces) return this;
    return AppSurfaces(
      cardShadow: t < 0.5 ? cardShadow : other.cardShadow,
      glassTint: Color.lerp(glassTint, other.glassTint, t) ?? glassTint,
      glassBorder: Color.lerp(glassBorder, other.glassBorder, t) ?? glassBorder,
    );
  }
}

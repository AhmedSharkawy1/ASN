import 'package:flutter/material.dart';

/// Ocean palette — the sea reference, but with real depth.
///
/// The pale swatches stay as *tints* (chip fills, badges, washes); the colours
/// that carry meaning — primary actions, status, module accents — are deep and
/// saturated so they read clearly against glass surfaces.
class AppColors {
  AppColors._();

  // ---------------------------------------------------------------- Brand
  /// Palest icy blue — subtle fills and tints only.
  static const Color mistBlue = Color(0xFFDCE6EC);

  /// Pale blue — soft washes.
  static const Color paleBlue = Color(0xFFBBD3E5);

  /// Mid sea blue — secondary accents, still light.
  static const Color seaBlue = Color(0xFF6FA3C7);

  /// Primary action colour — deep ocean blue with presence.
  static const Color oceanBlue = Color(0xFF2F6690);

  /// Darker ocean for pressed / emphasis states.
  static const Color deepOcean = Color(0xFF1E4E70);

  /// Steel blue — mid-tone accent from the reference image.
  static const Color steelBlue = Color(0xFF4A7FA8);

  /// Deep slate — headings and dark accents.
  static const Color slateBlue = Color(0xFF33556F);

  /// Graphite — deepest neutral.
  static const Color deepNavy = Color(0xFF2C3E4C);

  static const Color paletteGray = Color(0xFFD4D8DA);

  // Legacy aliases — everything that used to be teal now reads ocean blue.
  static const Color tealPrimary = oceanBlue;
  static const Color tealSecondary = steelBlue;
  static const Color emeraldPrimary = deepOcean;
  static const Color cyanAccent = seaBlue;
  static const Color blueAccent = steelBlue;

  // ---------------------------------------------------------------- Light
  static const Color lightBackground = Color(0xFFF1F5F9);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFCFDBE6);
  static const Color lightTextPrimary = Color(0xFF16202B);
  static const Color lightTextSecondary = Color(0xFF5A6B7B);

  /// Glass fills — opaque enough that text stays crisp.
  static Color get glassSurfaceLight => Colors.white.withValues(alpha: 0.82);
  static Color get glassCardLight => Colors.white.withValues(alpha: 0.78);
  static Color get glassBorderLight => const Color(0xFF2F6690).withValues(alpha: 0.12);

  // ----------------------------------------------------------------- Dark
  /// Deep navy-tinted dark, never pure black.
  static const Color darkBackground = Color(0xFF0D1620);
  static const Color darkCard = Color(0xFF16232F);
  static const Color darkCardElevated = Color(0xFF1F3040);
  static const Color darkBorder = Color(0xFF2A3E52);
  static const Color darkTextPrimary = Color(0xFFF2F6FA);
  static const Color darkTextSecondary = Color(0xFF9FB2C4);

  static Color get glassSurfaceDark => const Color(0xFF16232F).withValues(alpha: 0.80);
  static Color get glassCardDark => const Color(0xFF1F3040).withValues(alpha: 0.72);
  static Color get glassBorderDark => Colors.white.withValues(alpha: 0.10);

  // --------------------------------------------------------------- Status
  // Saturated enough to be read at a glance across a busy screen.
  static const Color success = Color(0xFF2E9E6B);
  static const Color warning = Color(0xFFE09B3D);
  static const Color error = Color(0xFFD65A55);
  static const Color info = Color(0xFF3E86C4);

  // ------------------------------------------------- Module accent colours
  // Distinct hues so modules stay recognisable, all pulled toward the
  // blue-green sea family so the dashboard still reads as one product.
  static const Color modulePos = Color(0xFF2F6690);
  static const Color moduleOrders = Color(0xFF1F7A8C);
  static const Color moduleProducts = Color(0xFF2E8B87);
  static const Color moduleKitchen = Color(0xFFC77D3A);
  static const Color moduleCustomers = Color(0xFF5A6BA8);
  static const Color moduleReports = Color(0xFF46568F);
  static const Color moduleInventory = Color(0xFF2F8F6B);
  static const Color moduleTables = Color(0xFFB06A54);
  static const Color moduleDelivery = Color(0xFFCF8B34);
  static const Color modulePromotions = Color(0xFFC25E6B);
  static const Color moduleHr = Color(0xFF4A7FA8);

  // ------------------------------------------------------------ Gradients
  static const LinearGradient brandGradient = LinearGradient(
    colors: [oceanBlue, deepOcean],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient blueCyanGradient = LinearGradient(
    colors: [steelBlue, oceanBlue],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // -------------------------------------------------------------- Shadows
  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: const Color(0xFF16202B).withValues(alpha: 0.10),
          blurRadius: 20,
          offset: const Offset(0, 6),
        ),
      ];

  static List<BoxShadow> get darkShadow => [
        BoxShadow(
          color: Colors.black.withValues(alpha: 0.35),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  static List<BoxShadow> shadowOf(BuildContext context) =>
      Theme.of(context).brightness == Brightness.dark ? darkShadow : softShadow;
}

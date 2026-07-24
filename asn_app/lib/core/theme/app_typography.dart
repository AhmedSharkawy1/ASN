import 'package:flutter/material.dart';

/// Inter for Latin, Cairo for Arabic. Weights stay in the 400–700 band and
/// headings avoid heavy weights so text feels calm rather than shouty.
class AppTypography {
  AppTypography._();

  static const String fontFamily = 'Inter';
  static const List<String> fontFallback = ['Cairo'];

  static const TextStyle displayLarge = TextStyle(
    fontSize: 52,
    fontWeight: FontWeight.w600,
    letterSpacing: -1.0,
    height: 1.15,
  );

  static const TextStyle displayMedium = TextStyle(
    fontSize: 42,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.8,
    height: 1.18,
  );

  static const TextStyle displaySmall = TextStyle(
    fontSize: 34,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.6,
    height: 1.22,
  );

  static const TextStyle headlineLarge = TextStyle(
    fontSize: 30,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.5,
    height: 1.28,
  );

  static const TextStyle headlineMedium = TextStyle(
    fontSize: 26,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.4,
    height: 1.3,
  );

  static const TextStyle headlineSmall = TextStyle(
    fontSize: 22,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.3,
    height: 1.34,
  );

  static const TextStyle titleLarge = TextStyle(
    fontSize: 19,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    height: 1.4,
  );

  static const TextStyle titleMedium = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.1,
    height: 1.45,
  );

  static const TextStyle titleSmall = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w500,
    letterSpacing: 0,
    height: 1.5,
  );

  static const TextStyle bodyLarge = TextStyle(
    fontSize: 16,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.55,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w400,
    letterSpacing: 0,
    height: 1.55,
  );

  static const TextStyle bodySmall = TextStyle(
    fontSize: 12.5,
    fontWeight: FontWeight.w400,
    letterSpacing: 0.1,
    height: 1.45,
  );

  static const TextStyle labelLarge = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.1,
    height: 1.4,
  );

  static const TextStyle labelMedium = TextStyle(
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.2,
    height: 1.35,
  );

  static const TextStyle labelSmall = TextStyle(
    fontSize: 11,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.3,
    height: 1.3,
  );
}

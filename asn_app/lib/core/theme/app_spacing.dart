import 'package:flutter/material.dart';

class AppSpacing {
  AppSpacing._();

  static const double xxs = 4.0;
  static const double xs = 8.0;
  static const double sm = 12.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  static const double xxxl = 64.0;

  // BorderRadius — Liquid Glass: everything soft, nothing sharp.
  static const double radiusXs = 8.0;
  static const double radiusSm = 12.0;
  static const double radiusMd = 18.0; // buttons, inputs
  static const double radiusLg = 24.0; // cards
  static const double radiusXl = 28.0; // dialogs
  static const double radiusSheet = 32.0; // bottom sheets
  static const double radiusRound = 999.0;

  // Glass surface tuning. Blur is deliberately restrained: heavy blur on
  // scrolling content destroys frame times on mid-range devices.
  static const double blurSoft = 18.0;
  static const double blurStrong = 30.0;

  // Motion
  static const Duration motionFast = Duration(milliseconds: 180);
  static const Duration motionBase = Duration(milliseconds: 240);
  static const Duration motionSlow = Duration(milliseconds: 280);
  static const Curve motionCurve = Curves.easeOutCubic;

  // SizedBox spacing helpers
  static const SizedBox heightXs = SizedBox(height: xs);
  static const SizedBox heightSm = SizedBox(height: sm);
  static const SizedBox heightMd = SizedBox(height: md);
  static const SizedBox heightLg = SizedBox(height: lg);
  static const SizedBox heightXl = SizedBox(height: xl);

  static const SizedBox widthXs = SizedBox(width: xs);
  static const SizedBox widthSm = SizedBox(width: sm);
  static const SizedBox widthMd = SizedBox(width: md);
  static const SizedBox widthLg = SizedBox(width: lg);
  static const SizedBox widthXl = SizedBox(width: xl);
}

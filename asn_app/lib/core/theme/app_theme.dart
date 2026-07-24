import 'package:flutter/material.dart';
import 'package:asn_app/core/theme/app_colors.dart';
import 'package:asn_app/core/theme/app_typography.dart';
import 'package:asn_app/core/theme/app_spacing.dart';
import 'package:asn_app/core/theme/app_theme_ext.dart';

/// Liquid Glass theme: neutral surfaces, hairline borders, soft elevation,
/// generous radii. Blur itself lives in the glass widgets — the theme only
/// supplies the colours, shapes and type that make blur read as "glass".
class AppTheme {
  AppTheme._();

  static const List<String> _fallback = AppTypography.fontFallback;

  static TextStyle _t(TextStyle base) => base.copyWith(
        fontFamily: AppTypography.fontFamily,
        fontFamilyFallback: _fallback,
      );

  static TextTheme _textTheme(Color body, Color muted) => TextTheme(
        displayLarge: _t(AppTypography.displayLarge),
        displayMedium: _t(AppTypography.displayMedium),
        displaySmall: _t(AppTypography.displaySmall),
        headlineLarge: _t(AppTypography.headlineLarge),
        headlineMedium: _t(AppTypography.headlineMedium),
        headlineSmall: _t(AppTypography.headlineSmall),
        titleLarge: _t(AppTypography.titleLarge),
        titleMedium: _t(AppTypography.titleMedium),
        titleSmall: _t(AppTypography.titleSmall),
        bodyLarge: _t(AppTypography.bodyLarge),
        bodyMedium: _t(AppTypography.bodyMedium),
        bodySmall: _t(AppTypography.bodySmall).copyWith(color: muted),
        labelLarge: _t(AppTypography.labelLarge),
        labelMedium: _t(AppTypography.labelMedium),
        labelSmall: _t(AppTypography.labelSmall).copyWith(color: muted),
      ).apply(bodyColor: body, displayColor: body);

  // Subtle, quick, never bouncy.
  static const PageTransitionsTheme _transitions = PageTransitionsTheme(
    builders: {
      TargetPlatform.android: FadeUpwardsPageTransitionsBuilder(),
      TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
    },
  );

  // ------------------------------------------------------------- Buttons
  static ElevatedButtonThemeData _elevated(Color fg) => ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.oceanBlue,
          foregroundColor: fg,
          disabledBackgroundColor: AppColors.oceanBlue.withValues(alpha: 0.35),
          disabledForegroundColor: fg.withValues(alpha: 0.6),
          elevation: 0,
          shadowColor: Colors.transparent,
          minimumSize: const Size(64, 50),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          textStyle: _t(AppTypography.labelLarge),
        ),
      );

  static OutlinedButtonThemeData _outlined(Color border, Color fg) => OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: fg,
          minimumSize: const Size(64, 50),
          side: BorderSide(color: border),
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          textStyle: _t(AppTypography.labelLarge),
        ),
      );

  static TextButtonThemeData get _text => TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: AppColors.oceanBlue,
          minimumSize: const Size(48, 44),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
          ),
          textStyle: _t(AppTypography.labelLarge),
        ),
      );

  static InputDecorationTheme _input(Color fill, Color border, Color hint) =>
      InputDecorationTheme(
        filled: true,
        fillColor: fill,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm + 2,
        ),
        hintStyle: _t(AppTypography.bodyMedium).copyWith(color: hint),
        labelStyle: _t(AppTypography.bodyMedium).copyWith(color: hint),
        floatingLabelStyle: _t(AppTypography.labelMedium).copyWith(color: AppColors.oceanBlue),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          borderSide: BorderSide(color: border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          borderSide: BorderSide(color: border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          borderSide: const BorderSide(color: AppColors.oceanBlue, width: 1.4),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          borderSide: const BorderSide(color: AppColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          borderSide: const BorderSide(color: AppColors.error, width: 1.4),
        ),
      );

  static ThemeData _base({
    required Brightness brightness,
    required ColorScheme scheme,
    required Color background,
    required Color card,
    required Color border,
    required Color textPrimary,
    required Color textMuted,
    required Color inputFill,
    required AppGlass glass,
    required AppSurfaces surfaces,
  }) {
    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: background,
      fontFamily: AppTypography.fontFamily,
      fontFamilyFallback: _fallback,
      splashFactory: InkSparkle.splashFactory,
      visualDensity: VisualDensity.adaptivePlatformDensity,
      pageTransitionsTheme: _transitions,
      textTheme: _textTheme(textPrimary, textMuted),

      cardTheme: CardThemeData(
        color: card,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          side: BorderSide(color: border),
        ),
      ),

      appBarTheme: AppBarTheme(
        backgroundColor: background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: textPrimary),
        titleTextStyle: _t(AppTypography.titleLarge).copyWith(color: textPrimary),
      ),

      inputDecorationTheme: _input(inputFill, border, textMuted),
      elevatedButtonTheme: _elevated(Colors.white),
      outlinedButtonTheme: _outlined(border, textPrimary),
      textButtonTheme: _text,

      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: AppColors.oceanBlue,
        foregroundColor: Colors.white,
        elevation: 2,
        highlightElevation: 4,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        extendedTextStyle: _t(AppTypography.labelLarge),
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? Colors.white : null,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (s) => s.contains(WidgetState.selected) ? AppColors.oceanBlue : null,
        ),
      ),

      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: AppColors.oceanBlue,
        linearMinHeight: 3,
      ),

      dialogTheme: DialogThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
          side: BorderSide(color: border),
        ),
        titleTextStyle: _t(AppTypography.titleLarge).copyWith(color: textPrimary),
        contentTextStyle: _t(AppTypography.bodyMedium).copyWith(color: textPrimary),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: card,
        surfaceTintColor: Colors.transparent,
        modalBackgroundColor: card,
        elevation: 0,
        showDragHandle: true,
        dragHandleColor: textMuted.withValues(alpha: 0.35),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppSpacing.radiusSheet)),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: brightness == Brightness.dark
            ? AppColors.darkCardElevated
            : AppColors.deepNavy,
        contentTextStyle: _t(AppTypography.bodyMedium).copyWith(color: Colors.white),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        elevation: 0,
        insetPadding: const EdgeInsets.all(AppSpacing.md),
      ),

      popupMenuTheme: PopupMenuThemeData(
        color: card,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          side: BorderSide(color: border),
        ),
        textStyle: _t(AppTypography.bodyMedium).copyWith(color: textPrimary),
      ),

      chipTheme: ChipThemeData(
        backgroundColor: brightness == Brightness.dark
            ? Colors.white.withValues(alpha: 0.04)
            : Colors.white.withValues(alpha: 0.7),
        selectedColor: AppColors.oceanBlue.withValues(alpha: 0.14),
        labelStyle: _t(AppTypography.labelMedium).copyWith(color: textPrimary),
        side: BorderSide(color: border),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusRound),
        ),
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 6),
      ),

      tabBarTheme: TabBarThemeData(
        labelColor: AppColors.oceanBlue,
        unselectedLabelColor: textMuted,
        indicatorColor: AppColors.oceanBlue,
        indicatorSize: TabBarIndicatorSize.label,
        dividerColor: Colors.transparent,
        labelStyle: _t(AppTypography.labelLarge),
        unselectedLabelStyle: _t(AppTypography.bodyMedium),
      ),

      listTileTheme: ListTileThemeData(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        ),
        minVerticalPadding: AppSpacing.sm,
        iconColor: textMuted,
      ),

      dividerTheme: DividerThemeData(color: border, thickness: 1, space: 1),

      drawerTheme: DrawerThemeData(
        backgroundColor: background,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.horizontal(right: Radius.circular(AppSpacing.radiusSheet)),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        indicatorColor: AppColors.oceanBlue.withValues(alpha: 0.14),
        elevation: 0,
        height: 64,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => _t(AppTypography.labelSmall).copyWith(
            color: s.contains(WidgetState.selected) ? AppColors.oceanBlue : textMuted,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (s) => IconThemeData(
            size: 24,
            color: s.contains(WidgetState.selected) ? AppColors.oceanBlue : textMuted,
          ),
        ),
      ),

      navigationRailTheme: NavigationRailThemeData(
        backgroundColor: Colors.transparent,
        indicatorColor: AppColors.oceanBlue.withValues(alpha: 0.14),
        selectedLabelTextStyle:
            _t(AppTypography.labelSmall).copyWith(color: AppColors.oceanBlue),
        unselectedLabelTextStyle: _t(AppTypography.labelSmall).copyWith(color: textMuted),
        selectedIconTheme: const IconThemeData(color: AppColors.oceanBlue, size: 24),
        unselectedIconTheme: IconThemeData(color: textMuted, size: 24),
      ),

      extensions: [glass, surfaces],
    );
  }

  static ThemeData get lightTheme => _base(
        brightness: Brightness.light,
        scheme: const ColorScheme.light(
          primary: AppColors.oceanBlue,
          onPrimary: Colors.white,
          secondary: AppColors.steelBlue,
          tertiary: AppColors.deepNavy,
          error: AppColors.error,
          surface: AppColors.lightCard,
          onSurface: AppColors.lightTextPrimary,
          onSurfaceVariant: AppColors.lightTextSecondary,
          outline: AppColors.lightBorder,
          surfaceContainerHighest: Color(0xFFECEEF2),
        ),
        background: AppColors.lightBackground,
        card: AppColors.lightCard,
        border: AppColors.lightBorder,
        textPrimary: AppColors.lightTextPrimary,
        textMuted: AppColors.lightTextSecondary,
        inputFill: Colors.white.withValues(alpha: 0.75),
        glass: AppGlass.light,
        surfaces: AppSurfaces.light,
      );

  static ThemeData get darkTheme => _base(
        brightness: Brightness.dark,
        scheme: const ColorScheme.dark(
          primary: AppColors.seaBlue,
          onPrimary: Color(0xFF0D1620),
          secondary: AppColors.steelBlue,
          tertiary: AppColors.paleBlue,
          error: AppColors.error,
          surface: AppColors.darkCard,
          onSurface: AppColors.darkTextPrimary,
          onSurfaceVariant: AppColors.darkTextSecondary,
          outline: AppColors.darkBorder,
          surfaceContainerHighest: AppColors.darkCardElevated,
        ),
        background: AppColors.darkBackground,
        card: AppColors.darkCard,
        border: AppColors.darkBorder,
        textPrimary: AppColors.darkTextPrimary,
        textMuted: AppColors.darkTextSecondary,
        inputFill: Colors.white.withValues(alpha: 0.04),
        glass: AppGlass.dark,
        surfaces: AppSurfaces.dark,
      );
}

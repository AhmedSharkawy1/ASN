import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  // Primary brand colors (Teal & Emerald)
  static const Color tealPrimary = Color(0xFF0D9488); // Teal-600
  static const Color tealSecondary = Color(0xFF14B8A6); // Teal-500
  static const Color emeraldPrimary = Color(0xFF059669); // Emerald-600
  static const Color cyanAccent = Color(0xFF06B6D4); // Cyan-500
  static const Color blueAccent = Color(0xFF2EA3FF); // Brand blue from web

  // Dark theme palette
  static const Color darkBackground = Color(0xFF030712); // Slate-950
  static const Color darkCard = Color(0xFF0F172A); // Slate-900
  static const Color darkBorder = Color(0xFF1E293B); // Slate-800
  static const Color darkTextPrimary = Color(0xFFF8FAFC); // Slate-50
  static const Color darkTextSecondary = Color(0xFF94A3B8); // Slate-400

  // Light theme palette
  static const Color lightBackground = Color(0xFFF8FAFC); // Slate-50
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightBorder = Color(0xFFE2E8F0); // Slate-200
  static const Color lightTextPrimary = Color(0xFF0F172A); // Slate-900
  static const Color lightTextSecondary = Color(0xFF64748B); // Slate-500

  // Status colors
  static const Color success = Color(0xFF10B981); // Emerald-500
  static const Color warning = Color(0xFFF59E0B); // Amber-500
  static const Color error = Color(0xFFEF4444); // Red-500
  static const Color info = Color(0xFF3B82F6); // Blue-500

  // Gradients
  static const LinearGradient brandGradient = LinearGradient(
    colors: [tealPrimary, emeraldPrimary],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient blueCyanGradient = LinearGradient(
    colors: [blueAccent, cyanAccent],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

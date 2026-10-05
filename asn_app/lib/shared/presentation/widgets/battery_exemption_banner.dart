import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

/// A notification bar prompting the user to exempt the app from battery optimization.
/// Without this exemption, Android suspends background network and defers new-order
/// notifications until the screen is turned on.
class BatteryExemptionBanner extends StatefulWidget {
  const BatteryExemptionBanner({super.key});

  @override
  State<BatteryExemptionBanner> createState() => _BatteryExemptionBannerState();
}

class _BatteryExemptionBannerState extends State<BatteryExemptionBanner> with WidgetsBindingObserver {
  bool _needsExemption = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _check();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _check();
    }
  }

  Future<void> _check() async {
    if (!Platform.isAndroid) return;
    try {
      final exempt = await FlutterForegroundTask.isIgnoringBatteryOptimizations;
      if (mounted) {
        setState(() => _needsExemption = !exempt);
      }
    } catch (_) {}
  }

  Future<void> _requestExemption() async {
    try {
      await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      await Future<void>.delayed(const Duration(milliseconds: 500));
      final exempt = await FlutterForegroundTask.isIgnoringBatteryOptimizations;
      if (!exempt) {
        await FlutterForegroundTask.openIgnoreBatteryOptimizationSettings();
      }
      if (mounted) {
        await _check();
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (!_needsExemption) return const SizedBox.shrink();

    return Material(
      color: const Color(0xFFD97706), // Amber-600
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 8),
          child: Row(
            children: [
              const Icon(Icons.bolt, color: Colors.white, size: 22),
              const SizedBox(width: AppSpacing.sm),
              const Expanded(
                child: Text(
                  'لتصلك إشعارات الطلبات فوراً وشاشة الهاتف مغلقة، اضغط لتفعيل استثناء البطارية',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              ElevatedButton(
                onPressed: _requestExemption,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: const Color(0xFFB45309),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  visualDensity: VisualDensity.compact,
                  elevation: 2,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: const Text(
                  'تفعيل الآن',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

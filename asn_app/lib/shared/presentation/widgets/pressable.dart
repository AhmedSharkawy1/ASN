import 'package:flutter/material.dart';
import 'package:asn_app/core/theme/app_spacing.dart';

/// Wraps a child with a subtle scale-down animation on press,
/// giving buttons and tiles a tactile, premium feel.
class Pressable extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final double pressedScale;

  const Pressable({
    super.key,
    required this.child,
    required this.onTap,
    this.pressedScale = 0.96,
  });

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: AppSpacing.motionFast,
  );
  late final Animation<double> _scale = Tween<double>(begin: 1.0, end: widget.pressedScale)
      .animate(CurvedAnimation(parent: _controller, curve: AppSpacing.motionCurve));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) {
        _controller.reverse();
        widget.onTap();
      },
      onTapCancel: () => _controller.reverse(),
      child: ScaleTransition(scale: _scale, child: widget.child),
    );
  }
}

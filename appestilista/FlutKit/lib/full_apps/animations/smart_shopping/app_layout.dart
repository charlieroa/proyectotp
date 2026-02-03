import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';

class AppLayout extends StatefulWidget {
  final Widget? child;
  const AppLayout({super.key, this.child});

  @override
  State<AppLayout> createState() => _AppLayoutState();
}

class _AppLayoutState extends State<AppLayout> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late ThemeData theme;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    theme = AppTheme.smartShopping;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  LinearGradient _buildAnimatedGradient(double value) {
    ColorScheme colorScheme = theme.colorScheme;
    final phase = value * pi;

    final color1 = Color.lerp(
      colorScheme.primaryContainer.withValues(alpha: 0.3),
      colorScheme.secondaryContainer.withValues(alpha: 0.3),
      sin(phase) * 0.5 + 0.5,
    )!;
    final color2 = Color.lerp(
      colorScheme.secondaryContainer.withValues(alpha: 0.3),
      colorScheme.tertiaryContainer.withValues(alpha: 0.3),
      sin(phase + pi / 3) * 0.5 + 0.5,
    )!;
    final color3 = Color.lerp(
      colorScheme.tertiaryContainer.withValues(alpha: 0.3),
      colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
      sin(phase + 2 * pi / 3) * 0.5 + 0.5,
    )!;
    final color4 = Color.lerp(
      colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
      colorScheme.errorContainer.withValues(alpha: 0.3),
      sin(phase + pi) * 0.5 + 0.5,
    )!;
    final color5 = Color.lerp(
      colorScheme.errorContainer.withValues(alpha: 0.3),
      colorScheme.inversePrimary.withValues(alpha: 0.3),
      sin(phase + 4 * pi / 3) * 0.5 + 0.5,
    )!;
    final color6 = Color.lerp(
      colorScheme.inversePrimary.withValues(alpha: 0.3),
      colorScheme.primaryContainer.withValues(alpha: 0.3),
      sin(phase + 5 * pi / 3) * 0.5 + 0.5,
    )!;

    return LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [color1, color2, color3, color4, color5, color6]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return Container(
            decoration: BoxDecoration(gradient: _buildAnimatedGradient(_controller.value)),
            child: widget.child,
          );
        },
      ),
    );
  }
}

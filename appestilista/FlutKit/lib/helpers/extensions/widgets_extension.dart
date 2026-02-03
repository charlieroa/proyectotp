import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

extension IconExtension on Icon {
  Icon autoDirection() {
    if (AppTheme.textDirection == TextDirection.ltr) return this;
    if (icon == LucideIcons.chevron_right) {
      return Icon(
        LucideIcons.chevron_left,
        color: color,
        textDirection: textDirection,
        size: size,
        key: key,
        semanticLabel: semanticLabel,
      );
    } else if (icon == LucideIcons.chevron_left) {
      return Icon(
        LucideIcons.chevron_right,
        color: color,
        textDirection: textDirection,
        size: size,
        key: key,
        semanticLabel: semanticLabel,
      );
    } else if (icon == LucideIcons.chevron_left) {
      return Icon(
        LucideIcons.chevron_right,
        color: color,
        textDirection: textDirection,
        size: size,
        key: key,
        semanticLabel: semanticLabel,
      );
    } else if (icon == LucideIcons.chevron_right) {
      return Icon(
        LucideIcons.chevron_left,
        color: color,
        textDirection: textDirection,
        size: size,
        key: key,
        semanticLabel: semanticLabel,
      );
    }
    return this;
  }
}

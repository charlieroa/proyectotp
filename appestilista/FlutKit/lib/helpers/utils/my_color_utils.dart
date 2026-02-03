import 'dart:math' as math;

import 'package:flutter/material.dart';

class MyColorUtils {
  static const Color starColor = Color(0xfff9c700);
  static const Color goldColor = Color(0xffFFDF00);
  static const Color silverColor = Color(0xffC0C0C0);

  static List<Color> getColorByRating() {
    return [
      Color(0xfff0323c), //For 0 star color
      Color(0xfff0323c), //For 1 star color
      Color(0xfff0323c).withAlpha(200), //For 2 star color
      Color(0xfff9c700), //For 3 star color
      Color(0xff3cd278).withAlpha(200), //For 4 star color
      Color(0xff3cd278) //For 5 star color
    ];
  }

  int brightness(Color c) {
    return math
        .sqrt(c.r * c.r * .241 +
            c.g * c.g * .691 +
            c.b * c.b * .068)
        .toInt();
  }
}

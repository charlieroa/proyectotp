import 'package:flutter/material.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';

import '../config/app_icons.dart';

class ButtonCommon extends StatelessWidget {
  final String? text;
  final VoidCallback? onTap;
  final Color? textColor;
  final Color? buttonColor;
  final Color? borderColor;
  final double? height;
  final double? width;
  final String? fontFamily;
  final FontWeight? fontWeight;
  final double? fontSize;

  const ButtonCommon(
      {super.key,
      this.text,
      this.buttonColor,
      this.textColor,
      this.onTap,
      this.borderColor,
      this.height,
      this.width,
      this.fontFamily,
      this.fontWeight,
      this.fontSize});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: height,
        width: width,
        alignment: Alignment.center,
        decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppSize.height12),
            color: buttonColor,
            border: Border.all(color: borderColor ?? Colors.transparent)),
        child: Text(
          text!,
          style: TextStyle(
            fontFamily: fontFamily,
            color: textColor ?? AppColor.whiteColor,
            fontWeight: fontWeight,
            fontSize: fontSize,
          ),
        ),
      ),
    );
  }
}

class ShortButton extends StatelessWidget {
  final String? text;
  final double? height;
  final double? width;
  final Color? textColor;
  final Color? buttonColor;

  const ShortButton(
      {super.key,
      this.text,
      this.textColor,
      this.buttonColor,
      this.height,
      this.width});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: width,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppSize.height12),
        color: buttonColor,
      ),
      child: Image.asset(
        AppIcons.arrowIcon,
        width: AppSize.width22,
      ),
    );
  }
}

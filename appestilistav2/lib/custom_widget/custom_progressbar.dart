import 'package:flutter/material.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/font_family.dart';

class CustomProgressBar extends StatelessWidget {
  final String text;
  final String reviewsDetail;
  final double width;
  final int value;
  final int totalValue;
  final String? fontFamily;
  final Color? color;
  final double? fontSize;

  const CustomProgressBar({
    super.key,
    required this.text,
    required this.width,
    required this.value,
    required this.totalValue,
    this.fontFamily,
    this.color,
    this.fontSize,
    required this.reviewsDetail,
  });

  @override
  Widget build(BuildContext context) {
    double ratio = value / totalValue;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSize.height6),
      child: Row(
        children: [
          Image.asset(
            AppImage.starIcon,
            height: AppSize.height12,
            width: AppSize.width12,
            color: Theme.of(context).appBarTheme.titleTextStyle?.color,
          ),
          const SizedBox(width: AppSize.width6),
          Text(
            text,
            style: TextStyle(
                fontFamily: FontFamily.mulishSemiBold,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                fontWeight: FontWeight.w600,
                fontSize: AppSize.height14,
                fontStyle: FontStyle.normal),
          ),
          const SizedBox(width: AppSize.height12),
          Expanded(
            child: Row(mainAxisAlignment: MainAxisAlignment.start, children: [
              Stack(
                children: [
                  Container(
                    width: width,
                    height: AppSize.height5,
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(AppSize.height5),
                        color: Theme.of(context).secondaryHeaderColor),
                  ),
                  Material(
                    borderRadius: BorderRadius.circular(AppSize.height5),
                    child: AnimatedContainer(
                      height: AppSize.height5,
                      width: width * ratio,
                      duration: Duration(milliseconds: totalValue),
                      decoration: BoxDecoration(
                        color:
                            Theme.of(context).appBarTheme.titleTextStyle?.color,
                        borderRadius: BorderRadius.circular(AppSize.height5),
                      ),
                    ),
                  ),
                ],
              ),
              const Spacer(),
              Text(
                reviewsDetail,
                textAlign: TextAlign.start,
                style: TextStyle(
                    fontFamily: FontFamily.mulishRegular,
                    color: Theme.of(context).textTheme.titleMedium?.color,
                    fontWeight: FontWeight.w400,
                    fontSize: AppSize.height12,
                    fontStyle: FontStyle.normal),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}

class TimeState with ChangeNotifier {
  int _time = 100;
  int get time => _time;
  set time(int newTime) {
    _time = newTime;
    notifyListeners();
  }
}

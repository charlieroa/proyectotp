import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/about_us_controller.dart';

class AboutUsScreen extends StatelessWidget {
  AboutUsScreen({Key? key}) : super(key: key);

  final AboutUsController termsAndConditionsController =
      Get.put(AboutUsController());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      resizeToAvoidBottomInset: true,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).appBarTheme.shadowColor!,
                spreadRadius: AppSize.height0,
                blurRadius: AppSize.height7,
                offset: const Offset(AppSize.height0, AppSize.height4),
              ),
            ],
          ),
          child: AppBar(
              scrolledUnderElevation: 0.0,
              shadowColor: Theme.of(context).appBarTheme.shadowColor,
              backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
              centerTitle: false,
              automaticallyImplyLeading: false,
              title: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      Get.back();
                    },
                    child: Image.asset(
                      AppImage.arrowLeft,
                      width: AppSize.width24,
                      height: AppSize.height24,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                  Text(
                    AppString.aboutUs,
                    style: TextStyle(
                        fontFamily: FontFamily.mulishBold,
                        fontSize: AppSize.height18,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context)
                            .appBarTheme
                            .titleTextStyle
                            ?.color),
                  ),
                ],
              )),
        ),
      ),
      body: ListView.builder(
        itemCount: termsAndConditionsController.aboutUsStringList.length,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemBuilder: (context, index) {
          return Column(
            children: [
              SizedBox(height: index == 0 ? AppSize.height18 : 0),
              Text(
                termsAndConditionsController.aboutUsStringList[index],
                style: TextStyle(
                  fontFamily: index == 0
                      ? FontFamily.mulishSemiBold
                      : FontFamily.mulishMedium,
                  fontSize: AppSize.height14,
                  fontWeight: index == 0 ? FontWeight.w600 : FontWeight.w500,
                  color: index == 0
                      ? Theme.of(context).appBarTheme.titleTextStyle?.color
                      : Theme.of(context).textTheme.titleMedium?.color,
                ),
              ),
              const SizedBox(height: AppSize.height16),
            ],
          );
        },
      ),
    );
  }
}

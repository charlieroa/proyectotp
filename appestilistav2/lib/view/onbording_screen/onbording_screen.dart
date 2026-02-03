import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import 'package:home_helper_flutter_ui_kit/config/font_family.dart';
import 'package:home_helper_flutter_ui_kit/controller/storage_controller.dart';

import '../../controller/dark_controller.dart';
import '../../controller/onbording_controller.dart';
import '../../custom_widget/common_button.dart';
import '../../model/onbording.dart';
import '../login_screen/login_screen.dart';

class OnBoardingScreen extends StatelessWidget {
  OnBoardingScreen({Key? key}) : super(key: key);
  final PageController _pageController = PageController(initialPage: 0);
  final OnBoardingController onBoardingController =
      Get.put(OnBoardingController());
  final DarkModeController darkModeController = Get.find<DarkModeController>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      floatingActionButtonLocation: FloatingActionButtonLocation.endTop,
      floatingActionButton: GestureDetector(
        onTap: () {
          StorageController.instance.setLogInFirst(false);
          Get.offAll(LoginScreen(status: "onBoarding"));
        },
        child: Obx(
          () => Container(
            margin: const EdgeInsets.only(top: 12),
            child: Text(
                onBoardingController.pageViewIndex.value == 0 ||
                        onBoardingController.pageViewIndex.value == 1
                    ? AppString.skip
                    : "",
                style: const TextStyle(
                    color: AppColor.blackColor,
                    fontWeight: FontWeight.w500,
                    decorationColor: AppColor.appColor,
                    fontSize: AppSize.height16)),
          ),
        ),
      ),
      body: Obx(
        () => Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: PageView.builder(
                itemCount: onBoardingList.length,
                controller: _pageController,
                allowImplicitScrolling: true,
                onPageChanged: (value) {
                  onBoardingController.pageViewIndex.value = value;
                },
                itemBuilder: (context, index) {
                  index = onBoardingController.pageViewIndex.value;
                  return Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      Container(
                        height: AppSize.height * 0.68,
                        width: AppSize.width,
                        color: onBoardingList[index].color,
                        alignment: Alignment.bottomCenter,
                        child: Image.asset(
                          alignment: Alignment.bottomCenter,
                          darkModeController.isLightTheme.value
                              ? onBoardingList[index].image ?? ""
                              : darkOnBoardingList[index].image ?? "",
                          height: AppSize.height / 1.7,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(
                          top: AppSize.height30,
                        ),
                        child: Column(
                          children: [
                            Text(
                              onBoardingList[index].title1 ?? "",
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: AppSize.height22,
                                  fontFamily: FontFamily.mulishBold,
                                  fontWeight: FontWeight.w700,
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color),
                            ),
                            const SizedBox(height: AppSize.height12),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: AppSize.height20),
                              child: Text(
                                onBoardingList[index].title2 ?? "",
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                    fontFamily: FontFamily.mulishRegular,
                                    fontSize: AppSize.height14,
                                    fontWeight: FontWeight.w400,
                                    color: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.color),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(
                  bottom: AppSize.height30,
                  right: AppSize.height20,
                  left: AppSize.height20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  Expanded(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: List.generate(
                        onBoardingList.length,
                        (int index) => buildDot(index: index, context: context),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      if (onBoardingController.pageViewIndex.value ==
                          onBoardingList.length - 1) {
                        StorageController.instance.setLogInFirst(false);
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                              builder: (_) =>
                                  LoginScreen(status: "onBoarding")),
                        );
                      }
                      _pageController.nextPage(
                          duration: const Duration(milliseconds: 100),
                          curve: Curves.bounceIn);
                    },
                    child: onBoardingController.pageViewIndex.value ==
                            onBoardingList.length - 1
                        ? const ButtonCommon(
                            text: AppString.startNow,
                            height: AppSize.height48,
                            width: AppSize.width200,
                            buttonColor: AppColor.primaryColorLightMode,
                            textColor: AppColor.whiteColor)
                        : const ShortButton(
                            height: AppSize.height48,
                            width: AppSize.width100,
                            buttonColor: AppColor.primaryColorLightMode,
                          ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget buildDot({required int index, context}) {
    return Container(
      padding: const EdgeInsets.all(AppSize.height3),
      margin: const EdgeInsets.all(AppSize.height2),
      decoration: BoxDecoration(
          border: Border.all(
            color: onBoardingController.pageViewIndex.value == index
                ? AppColor.primaryColorLightMode
                : Theme.of(context).cardColor,
          ),
          borderRadius: BorderRadius.circular(30)),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        height: onBoardingController.pageViewIndex.value == index
            ? AppSize.height8
            : AppSize.height10,
        width: onBoardingController.pageViewIndex.value == index
            ? AppSize.height9
            : AppSize.height10,
        decoration: BoxDecoration(
          color: onBoardingController.pageViewIndex.value == index
              ? AppColor.primaryColorLightMode
              : AppColor.onBoardingIndicatorColor,
          borderRadius: BorderRadius.circular(
            AppSize.height11,
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/view/login_screen/login_screen.dart';
import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/dark_controller.dart';
import '../../custom_widget/common_divider.dart';

class SettingScreen extends StatelessWidget {
  SettingScreen({Key? key}) : super(key: key);

  final DarkModeController darkModeController = Get.put(DarkModeController());

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
                  color: AppColor.appBarBoxShadowColor.withOpacity(0.10),
                  spreadRadius: AppSize.height0,
                  blurRadius: AppSize.height7,
                  offset: const Offset(AppSize.height0, AppSize.height4),
                ),
              ],
            ),
            child: AppBar(
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
                      AppString.setting,
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
        body: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSize.height4),
              Container(
                width: Get.width,
                padding: const EdgeInsets.only(
                    bottom: AppSize.height18,
                    left: AppSize.height20,
                    top: AppSize.height4),
                margin: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(AppSize.height12),
                  border: Border.all(
                    color: Theme.of(context).cardTheme.shadowColor!,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Theme.of(context).cardTheme.shadowColor!,
                      spreadRadius: AppSize.height0,
                      blurRadius: AppSize.height18,
                      offset: const Offset(
                        AppSize.height0,
                        AppSize.height4,
                      ),
                    ),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.only(right: AppSize.height10),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(AppString.updateOnWhatsApp,
                              style: TextStyle(
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color,
                                  fontFamily: FontFamily.mulishSemiBold,
                                  fontWeight: FontWeight.w600,
                                  fontSize: AppSize.height14)),
                          Obx(
                            () => Switch(
                                activeColor: AppColor.primaryColors,
                                activeTrackColor: AppColor.activeTrackColor,
                                inactiveThumbColor: const Color(0xffE8E8E8),
                                inactiveTrackColor: const Color(0xffD4D4D4),
                                value: darkModeController.switchUpdate.value,
                                onChanged: (value) {
                                  darkModeController.switchUpdate.value = value;
                                }),
                          ),
                        ],
                      ),
                      Padding(
                        padding: const EdgeInsets.only(right: AppSize.height10),
                        child: commonDivider(
                          color: Theme.of(context).dividerColor,
                        ),
                      ),
                      Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(AppString.darkMode,
                                style: TextStyle(
                                    color: Theme.of(context)
                                        .appBarTheme
                                        .titleTextStyle
                                        ?.color,
                                    fontFamily: FontFamily.mulishSemiBold,
                                    fontWeight: FontWeight.w600,
                                    fontSize: AppSize.height14)),
                            Obx(
                              () => Switch(
                                activeColor: AppColor.primaryColors,
                                activeTrackColor: AppColor.activeTrackColor,
                                inactiveThumbColor: const Color(0xffE8E8E8),
                                inactiveTrackColor: const Color(0xffD4D4D4),
                                value: darkModeController.isLightTheme.value ==
                                        true
                                    ? false
                                    : true,
                                onChanged: (value) {
                                  darkModeController.isLightTheme.value =
                                      !darkModeController.isLightTheme.value;
                                  darkModeController.saveThemeStatus();
                                },
                              ),
                            ),
                          ]),
                      Padding(
                        padding: const EdgeInsets.only(right: AppSize.height10),
                        child: commonDivider(
                          color: Theme.of(context).dividerColor,
                        ),
                      ),
                      const SizedBox(height: AppSize.height10),
                      GestureDetector(
                        onTap: () {
                          deleteAccountBottomSheet(context);
                        },
                        child: Container(
                          width: double.infinity,
                          color: Colors.transparent,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(AppString.deleteAccount,
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .appBarTheme
                                          .titleTextStyle
                                          ?.color,
                                      fontFamily: FontFamily.mulishSemiBold,
                                      fontWeight: FontWeight.w600,
                                      fontSize: AppSize.height14)),
                              Padding(
                                padding: const EdgeInsets.only(right: 8.0),
                                child: Image.asset(
                                  AppIcons.arrowRightIcon,
                                  height: AppSize.height20,
                                  width: AppSize.height20,
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color,
                                ),
                              )
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ]));
  }

  deleteAccountBottomSheet(BuildContext context) {
    return showModalBottomSheet(
      shape: const OutlineInputBorder(
        borderSide: BorderSide(color: Colors.transparent),
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(12),
          topLeft: Radius.circular(12),
        ),
      ),
      backgroundColor: Colors.transparent,
      context: context,
      constraints: BoxConstraints.loose(const Size.fromHeight(400)),
      builder: (context) {
        return Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(
                  bottom: AppSize.height10, right: AppSize.height5),
              child: GestureDetector(
                onTap: () {
                  Get.back();
                },
                child: Container(
                  color: Colors.transparent,
                  alignment: Alignment.centerRight,
                  child: Image.asset(
                    AppImage.cancelBottomSheet,
                    height: AppSize.height40,
                    width: AppSize.width40,
                  ),
                ),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(12),
                  topLeft: Radius.circular(12),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Container(
                    width: AppSize.width,
                    height: AppSize.height64,
                    decoration: const BoxDecoration(
                      color: AppColor.primaryColorDarkMode,
                      borderRadius: BorderRadius.only(
                        topRight: Radius.circular(12),
                        topLeft: Radius.circular(12),
                      ),
                    ),
                    child: const Padding(
                      padding: EdgeInsets.only(
                        left: AppSize.height20,
                        right: AppSize.height20,
                        top: AppSize.height22,
                        bottom: AppSize.height22,
                      ),
                      child: Text(
                        AppString.deleteAccount,
                        style: TextStyle(
                          fontFamily: FontFamily.mulishBold,
                          fontSize: AppSize.height16,
                          fontWeight: FontWeight.w700,
                          fontStyle: FontStyle.normal,
                          color: AppColor.whiteColor,
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(
                      left: AppSize.height20,
                      right: AppSize.height20,
                      top: AppSize.height20,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          AppString.areYouSureWantToDeleteYourAccount,
                          style: TextStyle(
                            fontFamily: FontFamily.mulishMedium,
                            fontSize: AppSize.height16,
                            fontWeight: FontWeight.w500,
                            fontStyle: FontStyle.normal,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                        const SizedBox(height: AppSize.height18),
                        Text(
                          AppString.pleaseNoteThatThisActionIs,
                          style: TextStyle(
                              fontFamily: FontFamily.mulishMedium,
                              color: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w500,
                              fontStyle: FontStyle.normal),
                        ),
                        const SizedBox(height: AppSize.height48)
                      ],
                    ),
                  ),
                  Container(
                    height: AppSize.height72,
                    width: MediaQuery.of(context).size.width,
                    decoration: BoxDecoration(
                      color: Theme.of(context).appBarTheme.backgroundColor,
                      boxShadow: [
                        BoxShadow(
                          color: Theme.of(context)
                              .appBarTheme
                              .systemOverlayStyle!
                              .statusBarColor!,
                          spreadRadius: AppSize.height0,
                          blurRadius: AppSize.height18,
                          offset: const Offset(
                            AppSize.height0,
                            AppSize.height10,
                          ),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.only(
                        left: AppSize.height20, right: AppSize.height20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              Get.back();
                            },
                            child: Container(
                                alignment: Alignment.center,
                                height: AppSize.height48,
                                width: AppSize.width206,
                                decoration: BoxDecoration(
                                    color: Theme.of(context)
                                        .appBarTheme
                                        .backgroundColor,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                        width: 1,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .tertiary)),
                                child: const Text(AppString.cancel,
                                    style: TextStyle(
                                        fontSize: AppSize.height16,
                                        fontStyle: FontStyle.normal,
                                        fontFamily: FontFamily.mulishSemiBold,
                                        fontWeight: FontWeight.w600,
                                        color:
                                            AppColor.primaryColorLightMode))),
                          ),
                        ),
                        const SizedBox(width: 10),
                        GestureDetector(
                          onTap: () {
                            Get.offAll(LoginScreen(status: 'true'));
                          },
                          child: Container(
                            alignment: Alignment.center,
                            height: AppSize.height48,
                            width: AppSize.width206,
                            decoration: BoxDecoration(
                              color: AppColor.primaryColors,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              AppString.deleteAccount,
                              style: TextStyle(
                                  fontSize: AppSize.height16,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishSemiBold,
                                  fontWeight: FontWeight.w600,
                                  color: AppColor.whiteColor),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

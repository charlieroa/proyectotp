import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_icons.dart';
import 'package:home_helper_flutter_ui_kit/controller/storage_controller.dart';
import 'package:home_helper_flutter_ui_kit/custom_widget/custom_text.dart';
import 'package:home_helper_flutter_ui_kit/view/login_screen/login_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/profile_screen/review_ratings_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/profile_screen/setting_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/profile_screen/terms_and_conditions_view.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../custom_widget/common_divider.dart';
import '../bookings_screen/bookings_screen.dart';
import 'about_us_screen.dart';
import 'edit_profile_screen.dart';
import 'help_center_screen.dart';
import 'language_screen.dart';
import 'manage_address_screen.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: Theme.of(context).appBarTheme.shadowColor!,
                spreadRadius: AppSize.height0,
                blurRadius: AppSize.height14,
                offset: const Offset(
                  AppSize.height0,
                  AppSize.height4,
                ),
              ),
            ],
          ),
          child: AppBar(
            scrolledUnderElevation: 0.0,
            shadowColor: Theme.of(context).appBarTheme.shadowColor,
            backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
            automaticallyImplyLeading: false,
            centerTitle: false,
            title: Padding(
              padding: const EdgeInsets.only(left: 4.0),
              child: Text(
                AppString.myProfile.tr,
                style: TextStyle(
                  fontFamily: FontFamily.mulishBold,
                  fontSize: AppSize.height18,
                  fontStyle: FontStyle.normal,
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                ),
              ),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSize.height24),
              editCard(context),
              const SizedBox(height: AppSize.height16),
              bookingCard(context),
              const SizedBox(height: AppSize.height16),
              languageCard(context),
              const SizedBox(height: AppSize.height16),
              settingCard(context),
              const SizedBox(height: AppSize.height30),
              logOutText(context),
              const SizedBox(height: AppSize.height30),
            ],
          ),
        ),
      ),
    );
  }

  editCard(context) {
    return Container(
      width: Get.width,
      padding: const EdgeInsets.all(AppSize.height12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSize.height12),
        border: Border.all(color: Theme.of(context).cardTheme.shadowColor!),
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
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              CustomText(
                  AppString.helloHenry.tr,
                  AppSize.height16,
                  Theme.of(context).appBarTheme.titleTextStyle!.color!,
                  FontFamily.mulishMedium,
                  FontWeight.w500),
              GestureDetector(
                  onTap: () {
                    Get.to(EditProfileScreen());
                  },
                  child: Image.asset(
                    AppIcons.editIcon,
                    height: AppSize.height14,
                    width: AppSize.height14,
                  ))
            ],
          ),
          const SizedBox(height: AppSize.height6),
          CustomText(
              AppString.emailHintText.tr,
              AppSize.height14,
              Theme.of(context).textTheme.titleMedium!.color!,
              FontFamily.mulishRegular,
              FontWeight.w400),
        ],
      ),
    );
  }

  bookingCard(BuildContext context) {
    return commonContainerWidget(
        Column(
          children: [
            GestureDetector(
              onTap: () {
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => BookingsScreen(
                              index: 1,
                            )));
              },
              child: Container(
                width: double.infinity,
                color: Colors.transparent,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    textWidget(AppString.myBookings.tr, context),
                    commonArrowRightIcon(context),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            GestureDetector(
              onTap: () {
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => ManageAddressScreen()));
              },
              child: Container(
                width: double.infinity,
                color: Colors.transparent,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    textWidget(AppString.manageAddress.tr, context),
                    commonArrowRightIcon(context)
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            GestureDetector(
              onTap: () {
                Navigator.push(
                    context,
                    MaterialPageRoute(
                        builder: (context) => ReviewRatingsScreen()));
              },
              child: Container(
                width: double.infinity,
                color: Colors.transparent,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    textWidget(AppString.myReviewAndRatings.tr, context),
                    commonArrowRightIcon(context)
                  ],
                ),
              ),
            ),
          ],
        ),
        context);
  }

  languageCard(BuildContext context) {
    return commonContainerWidget(
        Column(
          children: [
            GestureDetector(
              onTap: () {
                Navigator.push(context,
                    MaterialPageRoute(builder: (context) => LanguageScreen()));
              },
              child: Container(
                width: double.infinity,
                color: Colors.transparent,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    textWidget(AppString.languages.tr, context),
                    commonArrowRightIcon(context)
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            GestureDetector(
              onTap: () {
                Get.to(AboutUsScreen());
              },
              child: Container(
                width: double.infinity,
                color: Colors.transparent,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    textWidget(AppString.aboutUs.tr, context),
                    commonArrowRightIcon(context)
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            GestureDetector(
              onTap: () {
                Get.to(const HelpCenterScreen());
              },
              child: Container(
                width: double.infinity,
                color: Colors.transparent,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    textWidget(AppString.helpCenter.tr, context),
                    commonArrowRightIcon(context)
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            GestureDetector(
              onTap: () {
                Get.to(TermsAndConditionsView());
              },
              child: Container(
                width: double.infinity,
                color: Colors.transparent,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    textWidget(AppString.termsConditions.tr, context),
                    commonArrowRightIcon(context)
                  ],
                ),
              ),
            ),
          ],
        ),
        context);
  }

  settingCard(BuildContext context) {
    return GestureDetector(
        onTap: () {
          Get.to(SettingScreen());
        },
        child: commonContainerWidget(
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                textWidget(AppString.setting.tr, context),
                commonArrowRightIcon(context),
              ],
            ),
            context));
  }

  logOutText(BuildContext context) {
    return GestureDetector(
      onTap: () {
        logOutBottomSheet(context);
      },
      child: Center(
        child: Text(AppString.logout.tr,
            style: const TextStyle(
                color: AppColor.logOutColor,
                fontFamily: FontFamily.mulishMedium,
                fontWeight: FontWeight.w500,
                fontSize: AppSize.height16)),
      ),
    );
  }

  logOutBottomSheet(BuildContext context) {
    showModalBottomSheet(
      isDismissible: false,
      isScrollControlled: true,
      shape: const OutlineInputBorder(
        borderSide: BorderSide(color: Colors.transparent),
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(12),
          topLeft: Radius.circular(12),
        ),
      ),
      backgroundColor: Colors.transparent,
      context: context,
      constraints: BoxConstraints.loose(const Size.fromHeight(281)),
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
                        AppString.logout,
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
                      top: AppSize.height24,
                    ),
                    child: Text(
                      AppString.logoutString,
                      style: TextStyle(
                        fontFamily: FontFamily.mulishMedium,
                        fontSize: AppSize.height16,
                        fontWeight: FontWeight.w500,
                        fontStyle: FontStyle.normal,
                        color:
                            Theme.of(context).appBarTheme.titleTextStyle?.color,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSize.height48),
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
                          onTap: () async {
                            StorageController.instance.setLogIn(false);
                            Get.offAll(LoginScreen(
                              status: "true",
                            ));
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
                              AppString.logout,
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

  commonArrowRightIcon(context) {
    return Image.asset(
      AppIcons.arrowRightIcon,
      color: Theme.of(context).appBarTheme.titleTextStyle?.color,
      height: AppSize.height20,
      width: AppSize.height20,
    );
  }

  textWidget(String? text, context) {
    return Text(text!,
        style: TextStyle(
            color: Theme.of(context).appBarTheme.titleTextStyle?.color,
            fontFamily: FontFamily.mulishSemiBold,
            fontWeight: FontWeight.w600,
            fontSize: AppSize.height14));
  }

  commonContainerWidget(Widget child, context) {
    return Container(
      width: Get.width,
      padding: const EdgeInsets.symmetric(
          horizontal: AppSize.height20, vertical: AppSize.height18),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSize.height12),
        border: Border.all(color: Theme.of(context).cardTheme.shadowColor!),
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
      child: child,
    );
  }
}

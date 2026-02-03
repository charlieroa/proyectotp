import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/reset_password_controller.dart';
import 'package:home_helper_flutter_ui_kit/view/login_screen/login_screen.dart';

import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/dark_controller.dart';
import '../../custom_widget/common_button.dart';
import '../../custom_widget/custom_textfield.dart';

class ResetPasswordScreen extends StatelessWidget {
  ResetPasswordScreen({Key? key}) : super(key: key);
  final DarkModeController darkModeController = Get.put(DarkModeController());
  final ResetPasswordController resetPasswordController =
      Get.put(ResetPasswordController());
  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Scaffold(
        backgroundColor:Theme.of(context).primaryColor,
        body: Form(
          key: resetPasswordController.resetFormKey,
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                bgImage(context),
                Padding(
                  padding: const EdgeInsets.only(
                    left: AppSize.width20,
                    right: AppSize.width20,
                    top: AppSize.height50,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      resetPasswordText(context),
                      const SizedBox(height: AppSize.height40),
                      passwordField(),
                      const SizedBox(height: AppSize.height24),
                      confirmPasswordField(),
                      const SizedBox(height: AppSize.height40),
                      resetPasswordButton(context),
                      const SizedBox(height: AppSize.height10)
                    ],
                  ),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget bgImage(BuildContext context) {
    return Container(
      color: AppColor.loginBgImageColor,
      height: Get.height/4.5,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Padding(
            padding: const EdgeInsets.only(
              left: AppSize.width24,
              bottom: AppSize.width5,
            ),
            child: Align(
              alignment: Alignment.topLeft,
              child: GestureDetector(
                onTap: () {
                  Navigator.of(context).pop();
                },
                child: Image.asset(
                  AppImage.arrowLeft,
                  height: AppSize.height24,
                  width: AppSize.width24,
                ),
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomCenter,
            child: Image.asset(
              AppImage.loginImage,
              height: Get.height/5.8,
            ),
          ),
        ],
      ),
    );
  }

  Widget resetPasswordText(context) {
    return  Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.start,
      children: [
        Text(
          AppString.resetPassword,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: AppSize.height24,
              fontFamily: FontFamily.mulishExtraBold,
              fontWeight: FontWeight.w800,
              fontStyle: FontStyle.normal,
              color:  Theme.of(context).appBarTheme.titleTextStyle?.color
                ),
        ),
        const SizedBox(height: AppSize.height6),
        Text(
          AppString.pleaseEnterBelowDetail,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: AppSize.height14,
              fontWeight: FontWeight.w500,
              fontFamily: FontFamily.mulishMedium,
              fontStyle: FontStyle.normal,
              color: Theme.of(context).textTheme.titleMedium?.color
                  ),
        ),
      ],
    );
  }

  Widget passwordField() {
    return Obx(
      () => CustomTextField(
        controller: resetPasswordController.passwordController,
        hintText: AppString.passwordHintText,
        obscureText: !resetPasswordController.isPasswordVisible.value,
        contentPadding: const EdgeInsets.only(
          right: AppSize.width20,
          left: AppSize.width20,
          top: AppSize.height17,
          bottom: AppSize.height17,
        ),
        fontSize: AppSize.height14,
        fontFamily: FontFamily.mulishMedium,
        fontWeight: FontWeight.w500,
        fontStyle: FontStyle.normal,
        color: AppColor.placeholderDarkMode,
        onTogglePasswordVisibility:
            resetPasswordController.togglePasswordVisibility,
        validator: (value) {
          if (value!.isEmpty) {
            return AppString.pleaseEnterPassword;
          } else {
            return null;
          }
        },
        suffixIcon: GestureDetector(
          onTap: () {
            resetPasswordController.togglePasswordVisibility();
          },
          child: Image.asset(
            resetPasswordController.isPasswordVisible.value
                ? AppImage.openEye
                : AppImage
                    .passwordVisibility,
            height: 0.1,
          ),
        ),
      ),
    );
  }

  Widget confirmPasswordField() {
    return Obx(
      () => CustomTextField(
        controller: resetPasswordController.confirmPasswordController,
        hintText: AppString.confirmPasswordHintText,
        obscureText: !resetPasswordController.isConfirmPasswordValid.value,
        contentPadding: const EdgeInsets.only(
          right: AppSize.width20,
          left: AppSize.width20,
          top: AppSize.height17,
          bottom: AppSize.height17,
        ),
        fontStyle: FontStyle.normal,
        fontSize: AppSize.height14,
        fontFamily: FontFamily.mulishMedium,
        fontWeight: FontWeight.w500,
        color: AppColor.placeholderDarkMode,
        onTogglePasswordVisibility:
            resetPasswordController.togglePasswordVisibility2,

        validator: (val) {
          if (val!.isEmpty) return AppString.pleaseEnterConfirmPassword;
          if (val != resetPasswordController.passwordController.text) {
            return AppString.notMatch;
          }
          return null;
        },
        suffixIcon: GestureDetector(
          onTap: () {
            resetPasswordController.togglePasswordVisibility2();
          },
          child: Image.asset(
            resetPasswordController.isConfirmPasswordValid.value
                ? AppImage.openEye
                : AppImage
                    .passwordVisibility,
            height: 0.1,
          ),
        ),
      ),
    );
  }

  Widget resetPasswordButton(context) {
    return Obx(
      () => ButtonCommon(
          onTap: () {
            if (resetPasswordController.resetFormKey.currentState!.validate()) {
              Get.to(LoginScreen(status: "true",))?.then(
                  (value) => FocusManager.instance.primaryFocus?.unfocus());
            }
          },
          text: AppString.resetPassword,
          height: AppSize.height52,
          width: AppSize.width,
          buttonColor: resetPasswordController.isValid.value
              ? AppColor.primaryColorLightMode
              : Theme.of(context).tabBarTheme.labelColor,
          borderColor: resetPasswordController.isValid.value
              ? AppColor.primaryColorLightMode
              :  Theme.of(context).tabBarTheme.labelColor,
          fontFamily: FontFamily.mulishSemiBold,
          fontWeight: FontWeight.w600,
          fontSize: AppSize.height16,
          textColor: AppColor.whiteColor),
    );
  }
}

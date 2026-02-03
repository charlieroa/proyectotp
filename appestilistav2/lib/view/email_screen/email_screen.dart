import 'package:email_validator/email_validator.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/email_controller.dart';
import 'package:home_helper_flutter_ui_kit/view/otp_screen/otp_screen.dart';

import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/dark_controller.dart';
import '../../custom_widget/common_button.dart';
import '../../custom_widget/custom_textfield.dart';

class EmailScreen extends StatelessWidget {
  EmailScreen({Key? key}) : super(key: key);
  final DarkModeController darkModeController = Get.put(DarkModeController());
  final EmailController emailController = Get.put(EmailController());

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Scaffold(
        backgroundColor: Theme.of(context).primaryColor,
        body: Form(
          key: emailController.formKey,
          child: SingleChildScrollView(
            child: Column(
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
                      emailText(context),
                      const SizedBox(height: AppSize.height40),
                      emailField(),
                      const SizedBox(height: AppSize.height40),
                      continueButton(context),
                    ],
                  ),
                ),
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
      height: Get.height / 4.5,
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
              height: Get.height / 5.8,
            ),
          ),
        ],
      ),
    );
  }

  Widget emailText(context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.start,
      children: [
        Text(
          AppString.emailId,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: AppSize.height24,
              fontWeight: FontWeight.w800,
              color: Theme.of(context).appBarTheme.titleTextStyle?.color),
        ),
        const SizedBox(height: AppSize.height6),
        Text(
          AppString.pleaseEnterBelowDetail,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: AppSize.height14,
              fontFamily: FontFamily.mulishMedium,
              fontWeight: FontWeight.w500,
              color: Theme.of(context).textTheme.titleMedium?.color),
        ),
      ],
    );
  }

  Widget emailField() {
    return CustomTextField(
      controller: emailController.emailController,
      hintText: AppString.emailHintText,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      validator: (value) {
        if (!EmailValidator.validate(value ?? "")) {
          return AppString.pleaseEnterValidEmail;
        } else {
          return null;
        }
      },
    );
  }

  Widget continueButton(context) {
    return Obx(
      () => ButtonCommon(
          onTap: () {
            if (emailController.formKey.currentState!.validate()) {
              Get.to(const OtpScreen())!.then(
                  (value) => FocusManager.instance.primaryFocus?.unfocus());
            }
          },
          text: AppString.continueText,
          height: AppSize.height52,
          width: AppSize.width,
          buttonColor: emailController.isValid.value
              ? AppColor.primaryColorLightMode
              : Theme.of(context).tabBarTheme.labelColor,
          borderColor: emailController.isValid.value
              ? AppColor.primaryColorLightMode
              : Theme.of(context).tabBarTheme.labelColor,
          fontFamily: FontFamily.mulishSemiBold,
          fontWeight: FontWeight.w600,
          fontSize: AppSize.height16,
          textColor: AppColor.whiteColor),
    );
  }
}

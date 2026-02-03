import 'package:cupertino_will_pop_scope/cupertino_will_pop_scope.dart';
import 'package:email_validator/email_validator.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/salon_screen_controller.dart';
import 'package:home_helper_flutter_ui_kit/controller/sign_up_controller.dart';
import 'package:home_helper_flutter_ui_kit/view/otp_screen/otp_screen.dart';

import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/dark_controller.dart';
import '../../controller/storage_controller.dart';
import '../../custom_widget/custom_textfield.dart';
import 'package:home_helper_flutter_ui_kit/custom_widget/common_button.dart';

import '../bottom_screen/bottom_screen.dart';
import '../login_screen/login_screen.dart';

class SignUpScreen extends StatelessWidget {
  SignUpScreen({
    super.key,
    required this.status,
  }) {
    salonScreenController = Get.put(SalonScreenController());
  }

  late final SalonScreenController salonScreenController;

  final DarkModeController darkModeController = Get.put(DarkModeController());
  final SignUpController signUpController = Get.put(SignUpController());
  final String status;
  final GlobalKey<FormState> signUpFormKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ConditionalWillPopScope(
        onWillPop: () async {
          if (status == "true") {
            Get.back();
          } else if (status == "false") {
            Navigator.of(context).pop();
            Navigator.of(context).pop();
          } else if (status == "onBoarding") {
            Get.back();
          }
          return true;
        },
        shouldAddCallback: false,
        child: Scaffold(
          backgroundColor: Theme.of(context).primaryColor,
          body: SingleChildScrollView(
            child: Form(
              key: signUpFormKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  bgImage(context),
                  Padding(
                    padding: EdgeInsets.only(
                      left: AppSize.width20,
                      right: AppSize.width20,
                      top: Get.height / 19,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        signInText(context),
                        const SizedBox(height: AppSize.height22),
                        nameField(),
                        const SizedBox(height: AppSize.height43),
                        emailField(),
                        const SizedBox(height: AppSize.height43),
                        passwordField(),
                        const SizedBox(height: AppSize.height43),
                        confirmPasswordField(),
                        const SizedBox(height: AppSize.height22),
                        signUpButton(context),
                        const SizedBox(height: AppSize.height22),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
          floatingActionButton: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              alreadyHaveAnAccount(context),
              const SizedBox(height: AppSize.height10),
            ],
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
                right: AppSize.height20, bottom: AppSize.height10),
            child: Align(
              alignment: Alignment.topRight,
              child: GestureDetector(
                  onTap: () {
                    if (status == "true") {
                      Get.offAll(const BottomScreen(
                        initialIndex: 0,
                      ));
                    } else if (status == "false") {
                      Navigator.of(context).pop();
                      Navigator.of(context).pop();
                    } else if (status == "onBoarding") {
                      Get.offAll(const BottomScreen(
                        initialIndex: 0,
                      ));
                    }
                  },
                  child: Image.asset(AppImage.cancelButton,
                      height: AppSize.height13)),
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

  Widget signInText(context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.start,
      children: [
        Text(
          AppString.signUp,
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
            fontWeight: FontWeight.w500,
            fontFamily: FontFamily.mulishMedium,
            color: Theme.of(context).textTheme.titleMedium?.color,
          ),
        )
      ],
    );
  }

  Widget nameField() {
    return CustomTextField(
      controller: signUpController.nameController,
      hintText: AppString.nameHintText,
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      contentPadding: const EdgeInsets.only(
        left: AppSize.width20,
        right: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterName;
        } else {
          return null;
        }
      },
    );
  }

  Widget emailField() {
    return CustomTextField(
      controller: signUpController.emailController,
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

  Widget passwordField() {
    return Column(
      children: [
        Obx(
          () => CustomTextField(
            controller: signUpController.passwordController,
            hintText: AppString.passwordHintText,
            obscureText: !signUpController.isPasswordVisible.value,
            contentPadding: const EdgeInsets.only(
              right: AppSize.width20,
              left: AppSize.width20,
              top: AppSize.height17,
              bottom: AppSize.height17,
            ),
            fontSize: AppSize.height14,
            fontFamily: FontFamily.mulishMedium,
            fontWeight: FontWeight.w500,
            color: AppColor.placeholderDarkMode,
            onTogglePasswordVisibility:
                signUpController.togglePasswordVisibility,
            validator: (value) {
              if (value!.isEmpty) {
                return AppString.pleaseEnterPassword;
              } else {
                return null;
              }
            },
            suffixIcon: GestureDetector(
              onTap: () {
                signUpController.togglePasswordVisibility();
              },
              child: Image.asset(
                signUpController.isPasswordVisible.value
                    ? AppImage.openEye
                    : AppImage.passwordVisibility,
                height: 0.1,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget confirmPasswordField() {
    return Column(
      children: [
        Obx(
          () => CustomTextField(
            controller: signUpController.confirmPasswordController,
            hintText: AppString.confirmPassword,
            obscureText: !signUpController.isConfirmPasswordValid.value,
            contentPadding: const EdgeInsets.only(
              right: AppSize.width20,
              left: AppSize.width20,
              top: AppSize.height17,
              bottom: AppSize.height17,
            ),
            fontSize: AppSize.height14,
            fontFamily: FontFamily.mulishMedium,
            fontWeight: FontWeight.w500,
            color: AppColor.placeholderDarkMode,
            onTogglePasswordVisibility:
                signUpController.togglePasswordVisibility2,
            validator: (val) {
              if (val!.isEmpty) return AppString.pleaseEnterConfirmPassword;
              if (val != signUpController.passwordController.text) {
                return AppString.notMatch;
              }
              return null;
            },
            suffixIcon: GestureDetector(
              onTap: () {
                signUpController.togglePasswordVisibility2();
              },
              child: Image.asset(
                signUpController.isConfirmPasswordValid.value
                    ? AppImage.openEye
                    : AppImage.passwordVisibility,
                height: 0.1,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget signUpButton(context) {
    return Obx(
      () => ButtonCommon(
          onTap: () async {
            if (signUpFormKey.currentState!.validate()) {
              await StorageController.instance.setLogIn(true);
              salonScreenController.getUserinfo();
              if (status == "false") {
                Navigator.pop(context);
                Navigator.pop(context);
              } else if (status != "false") {
                Get.to(const OtpScreen(
                  status: "signUp",
                ));
              }
            }
          },
          text: AppString.signUp,
          height: AppSize.height52,
          width: AppSize.width,
          buttonColor: signUpController.isValid.value
              ? AppColor.primaryColorLightMode
              : Theme.of(context).tabBarTheme.labelColor,
          borderColor: signUpController.isValid.value
              ? AppColor.primaryColorLightMode
              : Theme.of(context).tabBarTheme.labelColor,
          fontFamily: FontFamily.mulishRegular,
          fontWeight: FontWeight.w600,
          fontSize: AppSize.height16,
          textColor: AppColor.whiteColor),
    );
  }

  Widget alreadyHaveAnAccount(context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          AppString.alreadyHaveAnAccount,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: AppSize.height14,
              fontFamily: FontFamily.mulishMedium,
              fontWeight: FontWeight.w600,
              color: Theme.of(context).unselectedWidgetColor),
        ),
        const SizedBox(width: AppSize.width1),
        GestureDetector(
          onTap: () {
            Get.off(LoginScreen(status: status))?.then(
                (value) => FocusManager.instance.primaryFocus?.unfocus());
          },
          child: const Text(
            AppString.signIn,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontFamily: FontFamily.mulishBold,
                fontWeight: FontWeight.w500,
                color: AppColor.primaryColors),
          ),
        ),
      ],
    );
  }
}

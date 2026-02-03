import 'package:cupertino_will_pop_scope/cupertino_will_pop_scope.dart';
import 'package:email_validator/email_validator.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import 'package:home_helper_flutter_ui_kit/controller/login_controller.dart';
import 'package:home_helper_flutter_ui_kit/controller/salon_screen_controller.dart';
import 'package:home_helper_flutter_ui_kit/controller/storage_controller.dart';
import 'package:home_helper_flutter_ui_kit/custom_widget/common_button.dart';
import 'package:home_helper_flutter_ui_kit/view/email_screen/email_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/otp_screen/otp_screen.dart';

import '../../config/font_family.dart';
import '../../controller/dark_controller.dart';
import '../../custom_widget/custom_textfield.dart';
import '../../services/location_service.dart';
import '../bottom_screen/bottom_screen.dart';
import '../sign_up_screen/sign_up_screen.dart';

class LoginScreen extends StatelessWidget {
  LoginScreen({
    super.key,
    required this.status,
  });

  final String status;

  final SalonScreenController salonScreenController =
      Get.put(SalonScreenController());

  final DarkModeController darkModeController = Get.put(DarkModeController());

  final LoginController loginController = Get.put(LoginController());

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ConditionalWillPopScope(
        onWillPop: () async {
          if (status == "true") {
            Navigator.of(context).pop();
          } else if (status == "false") {
            Navigator.of(context).pop();
          } else if (status == "onBoarding") {
            Navigator.of(context).pop();
          }
          return true;
        },
        shouldAddCallback: false,
        child: Scaffold(
          backgroundColor: Theme.of(context).primaryColor,
          body: Form(
            key: loginController.loginFormKey,
            child: SingleChildScrollView(
              child: Column(
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
                        emailField(),
                        const SizedBox(height: AppSize.height43),
                        passwordField(),
                        const SizedBox(height: AppSize.height22),
                        signInButton(context),
                        const SizedBox(height: AppSize.height43),
                        onLoginWithText(context),
                        const SizedBox(height: AppSize.height43),
                        googleFbLogin(context),
                        const SizedBox(height: AppSize.height22),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          floatingActionButtonLocation:
              FloatingActionButtonLocation.centerFloat,
          floatingActionButton: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              donHaveAccountText(context),
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
                      Get.offAll(const BottomScreen(initialIndex: 0));
                    } else if (status == "false") {
                      Navigator.of(context).pop();
                    } else if (status == "onBoarding") {
                      Get.offAll(const BottomScreen(initialIndex: 0));
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
          AppString.signIn,
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
              color: Theme.of(context).textTheme.titleMedium?.color),
        ),
      ],
    );
  }

  Widget emailField() {
    return CustomTextField(
      controller: loginController.emailController,
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
            controller: loginController.passwordController,
            hintText: AppString.passwordHintText,
            obscureText: !loginController.isPasswordVisible.value,
            contentPadding: const EdgeInsets.only(
              right: AppSize.width20,
              left: AppSize.width20,
              top: AppSize.height17,
              bottom: AppSize.height17,
            ),
            fontSize: AppSize.height14,
            fontFamily: FontFamily.mulishMedium,
            fontWeight: FontWeight.w500,
            onTogglePasswordVisibility:
                loginController.togglePasswordVisibility,
            validator: (value) {
              if (value!.isEmpty) {
                return AppString.pleaseEnterPassword;
              } else {
                return null;
              }
            },
            suffixIcon: GestureDetector(
              onTap: () {
                loginController.togglePasswordVisibility();
              },
              child: Image.asset(
                loginController.isPasswordVisible.value
                    ? AppImage.openEye
                    : AppImage.passwordVisibility,
                height: 0.1,
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSize.height10),
        Align(
          alignment: Alignment.bottomRight,
          child: GestureDetector(
            onTap: () {
              Get.to(EmailScreen());
            },
            child: const Text(
              AppString.forgotPassword,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontFamily: FontFamily.mulishSemiBold,
                fontWeight: FontWeight.w700,
                fontSize: AppSize.height15,
                color: AppColor.primaryColors,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget signInButton(context) {
    return Obx(
      () => ButtonCommon(
          onTap: () async {
            if (loginController.loginFormKey.currentState!.validate()) {
              bool success = await loginController.login();
              if (success) {
                await StorageController.instance.setLogIn(true);
                // Inicializar geolocalización
                try {
                  await _initializeLocation();
                } catch (e) {
                  print('Error inicializando geolocalización: $e');
                }
                // Navegar a la pantalla principal
                status == "false"
                    ? Navigator.pop(context)
                    : Get.offAll(const BottomScreen(initialIndex: 0));
                
                Future.delayed(const Duration(milliseconds: 500), () {
                  loginController.emailController.clear();
                  loginController.passwordController.clear();
                });
              }
            }
          },
          text: loginController.isLoading.value ? 'Iniciando...' : AppString.signIn,
          height: AppSize.height52,
          width: AppSize.width,
          buttonColor: loginController.isValid.value && !loginController.isLoading.value
              ? AppColor.primaryColorLightMode
              : Theme.of(context).tabBarTheme.labelColor,
          borderColor: loginController.isValid.value && !loginController.isLoading.value
              ? AppColor.primaryColorLightMode
              : Theme.of(context).tabBarTheme.labelColor,
          fontFamily: FontFamily.mulishRegular,
          fontWeight: FontWeight.w600,
          fontSize: AppSize.height17,
          textColor: AppColor.whiteColor),
    );
  }

  Future<void> _initializeLocation() async {
    try {
      await LocationService.initialize();
      LocationService.startTracking();
    } catch (e) {
      print('Error inicializando geolocalización: $e');
    }
  }

  Widget onLoginWithText(context) {
    return Align(
      alignment: Alignment.center,
      child: Text(
        AppString.orLogInWith,
        textAlign: TextAlign.center,
        style: TextStyle(
            fontSize: AppSize.height16,
            fontFamily: FontFamily.mulishMedium,
            fontWeight: FontWeight.w600,
            color: Theme.of(context).textTheme.titleMedium?.color),
      ),
    );
  }

  Widget googleFbLogin(context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.start,
      children: [
        Expanded(
          child: Container(
            alignment: Alignment.center,
            padding: const EdgeInsets.symmetric(
              vertical: AppSize.height18,
            ),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppSize.height12),
              border: Border.all(
                color: Theme.of(context).dividerColor,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  AppImage.googleLogo,
                  height: AppSize.height20,
                ),
                const SizedBox(width: AppSize.width6),
                Text(
                  AppString.google,
                  style: TextStyle(
                    fontFamily: FontFamily.mulishMedium,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                    fontWeight: FontWeight.w500,
                    fontSize: AppSize.height15,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: AppSize.height20),
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(
              vertical: AppSize.height18,
            ),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppSize.height12),
              border: Border.all(
                color: Theme.of(context).dividerColor,
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(
                  AppImage.appleLogo,
                  height: AppSize.height22,
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                ),
                const SizedBox(width: AppSize.width6),
                Text(
                  AppString.apple,
                  style: TextStyle(
                    fontFamily: FontFamily.mulishMedium,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                    fontWeight: FontWeight.w600,
                    fontSize: AppSize.height15,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget donHaveAccountText(context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          AppString.donHaveAnAccount,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: AppSize.height14,
              fontFamily: FontFamily.mulishMedium,
              fontWeight: FontWeight.w500,
              color: Theme.of(context).unselectedWidgetColor),
        ),
        const SizedBox(width: AppSize.width1),
        GestureDetector(
          onTap: () {
            Get.off(SignUpScreen(status: status))?.then(
                (value) => FocusManager.instance.primaryFocus?.unfocus());
          },
          child: const Text(
            AppString.signUp,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontFamily: FontFamily.mulishBold,
                fontWeight: FontWeight.w700,
                color: AppColor.primaryColors),
          ),
        ),
      ],
    );
  }
}

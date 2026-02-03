import 'package:cupertino_will_pop_scope/cupertino_will_pop_scope.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/view/bottom_screen/bottom_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/reset_password_screen/reset_password_screen.dart';
import 'package:pinput/pinput.dart';

import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/dark_controller.dart';
import '../../controller/otp_controller.dart';

class OtpScreen extends StatefulWidget {
  final String? status;

  const OtpScreen({Key? key, this.status}) : super(key: key);

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final DarkModeController darkModeController = Get.put(DarkModeController());

  final OtpController otpController = Get.put(OtpController());

  @override
  void initState() {
    otpController.restartTimer();
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Scaffold(
        backgroundColor: Theme.of(context).primaryColor,
        body: ConditionalWillPopScope(
          onWillPop: () {
            otpController.pinPutController.clear();
            Navigator.of(context).pop();
            return Future(() => false);
          },
          shouldAddCallback: false,
          child: Form(
            key: otpController.otpFormKey,
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
                      otpText(context),
                      const SizedBox(height: AppSize.height40),
                      pinPutField(context),
                      const SizedBox(height: AppSize.height24),
                      countdown()
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
                  otpController.pinPutController.clear();
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

  Widget otpText(context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisAlignment: MainAxisAlignment.start,
      children: [
        Text(
          AppString.otp,
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

  Widget pinPutField(context) {
    return Pinput(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      controller: otpController.pinPutController,
      keyboardType: TextInputType.number,
      defaultPinTheme: PinTheme(
        width: AppSize.width70,
        height: AppSize.height52,
        padding: const EdgeInsets.only(left: 23, right: 23),
        textStyle: TextStyle(
          fontSize: AppSize.height16,
          fontFamily: FontFamily.mulishRegular,
          fontWeight: FontWeight.w400,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color,
        ),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
      ),
      onChanged: (value) {
        otpController.otp.value = value;
        if (value.length == 4) {
          if (otpController.otpFormKey.currentState!.validate()) {
            if (widget.status == "login" || widget.status == "signUp") {
              otpController.pinPutController.clear();
              Get.offAll(const BottomScreen(
                initialIndex: 0,
              ));
            } else {
              otpController.pinPutController.clear();
              Get.to(ResetPasswordScreen());
            }
          }
        }
      },
    );
  }

  Widget countdown() {
    return Obx(
      () => otpController.timerCompleted.value
          ? GestureDetector(
              onTap: () {
                if (otpController.timerCompleted.value) {
                  otpController.restartTimer();
                  otpController.pinPutController.clear();
                }
              },
              child: const Align(
                alignment: Alignment.centerRight,
                child: Text(
                  AppString.resendOtp,
                  style: TextStyle(
                    color: AppColor.primaryColorLightMode,
                    fontSize: AppSize.height14,
                    fontWeight: FontWeight.w600,
                    fontFamily: FontFamily.mulishSemiBold,
                    fontStyle: FontStyle.normal,
                  ),
                ),
              ),
            )
          : Align(
              alignment: Alignment.centerRight,
              child: Text(
                textAlign: TextAlign.end,
                otpController.getFormattedTime(),
                style: const TextStyle(
                  color: AppColor.primaryColorLightMode,
                  fontSize: AppSize.height14,
                  fontWeight: FontWeight.w600,
                  fontFamily: FontFamily.mulishSemiBold,
                ),
              ),
            ),
    );
  }
}

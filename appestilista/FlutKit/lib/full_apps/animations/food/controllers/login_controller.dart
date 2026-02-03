import 'package:flutkit/helpers/utils/my_string_utils.dart';
import 'package:flutter/material.dart';

import 'package:flutkit/full_apps/animations/food/views/forgot_password_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/full_app.dart';
import 'package:flutkit/full_apps/animations/food/views/register_screen.dart';
import 'package:get/get.dart';

class LogInController extends GetxController {
  TextEditingController emailTE = TextEditingController();
  TextEditingController passwordTE = TextEditingController();
  GlobalKey<FormState> formKey = GlobalKey();

  @override
  void onInit() {
    emailTE = TextEditingController(text: 'flutkit@coderthemes.com');
    passwordTE = TextEditingController(text: 'password');
    super.onInit();
  }


  String? validateEmail(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter email";
    } else if (!MyStringUtils.isEmail(text)) {
      return "Please enter valid email";
    }
    return null;
  }

  String? validatePassword(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter password";
    } else if (!MyStringUtils.validateStringRange(text, 6, 10)) {
      return "Password must be between 6 to 10";
    }
    return null;
  }

  void login() {
    if (formKey.currentState!.validate()) {
      Get.off(FullApp());
    }
  }

  void goToForgotPasswordScreen() {
    Get.off(ForgotPasswordScreen());
  }

  void goToRegisterScreen() {
    Get.off(RegisterScreen());
  }
}

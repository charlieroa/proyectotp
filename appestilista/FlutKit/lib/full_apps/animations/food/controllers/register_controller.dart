import 'package:flutkit/helpers/utils/my_string_utils.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/views/forgot_password_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/full_app.dart';
import 'package:flutkit/full_apps/animations/food/views/login_screen.dart';
import 'package:get/get.dart';

class RegisterController extends GetxController {
  late TextEditingController nameTE, emailTE, passwordTE;
  GlobalKey<FormState> formKey = GlobalKey();

  RegisterController() {
    nameTE = TextEditingController();
    emailTE = TextEditingController();
    passwordTE = TextEditingController();
  }

  String? validateEmail(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter email";
    } else if (MyStringUtils.isEmail(text)) {
      return "Please enter valid email";
    }
    return null;
  }

  String? validatePassword(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter password";
    } else if (!MyStringUtils.validateStringRange(text)) {
      return "Password length must between 8 and 20";
    }
    return null;
  }

  String? validateName(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter name";
    } else if (!MyStringUtils.validateStringRange(text, 4, 20)) {
      return "Password length must between 4 and 20";
    }
    return null;
  }

  void register() {
    if (formKey.currentState!.validate()) {
      Get.to(FullApp());
    }
  }

  void goToForgotPasswordScreen() {
    Get.off(ForgotPasswordScreen());
  }

  void goToLogInScreen() {
    Get.off(LogInScreen());
  }
}

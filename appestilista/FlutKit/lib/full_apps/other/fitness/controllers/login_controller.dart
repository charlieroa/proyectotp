import 'package:flutkit/full_apps/other/fitness/views/forgot_password_screen.dart';
import 'package:flutkit/full_apps/other/fitness/views/full_app.dart';
import 'package:flutkit/full_apps/other/fitness/views/register_screen.dart';
import 'package:flutkit/helpers/utils/my_string_utils.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class LogInController extends GetxController {
  late TextEditingController emailTE, passwordTE;
  GlobalKey<FormState> formKey = GlobalKey();

  LogInController() {
    emailTE = TextEditingController(text: 'flutkit@coderthemes.com');
    passwordTE = TextEditingController(text: 'password');
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
    } else if (!MyStringUtils.validateStringRange(
      text,
    )) {
      return "Password length must between 8 and 20";
    }
    return null;
  }

  void login() {
    if (formKey.currentState!.validate()) {
      Get.to(FullApp());
      // Navigator.push(
      //   context,
      //   MaterialPageRoute(
      //     builder: (context) => FullApp(),
      //   ),
      // );
    }
  }

  void goToForgotPasswordScreen() {
    Get.off(ForgotPasswordScreen());
    // Navigator.pushReplacement(
    //   context,
    //   MaterialPageRoute(
    //     builder: (context) => ForgotPasswordScreen(),
    //   ),
    // );
  }

  void goToRegisterScreen() {
    Get.off(RegisterScreen());
    // Navigator.pushReplacement(
    //   context,
    //   MaterialPageRoute(
    //     builder: (context) => RegisterScreen(),
    //   ),
    // );
  }
}

import 'package:flutkit/full_apps/animations/hr/hr_cache.dart';
import 'package:flutkit/full_apps/animations/hr/views/auth/forgot_password_screen.dart';
import 'package:flutkit/full_apps/animations/hr/views/auth/register_screen.dart';
import 'package:flutkit/full_apps/animations/hr/views/full_app.dart';
import 'package:flutkit/helpers/utils/my_string_utils.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class LoginController extends GetxController {
  GlobalKey<FormState> formKey = GlobalKey();
  TextEditingController emailController = TextEditingController();
  TextEditingController passwordController = TextEditingController();

  @override
  void onInit() {
    emailController = TextEditingController(text: 'flutkit@coderthemes.com');
    passwordController = TextEditingController(text: '123456');
    fetchData();
    super.onInit();
  }

  Future<void> fetchData() async {
    await EmployeeCommunicationCache.initDummy();
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

  void goToRegisterScreen() {
    Get.off(RegisterScreen());
  }

  void goToForgotPasswordScreen() {
    Get.off(ForgotPasswordScreen());
  }

  void login() {
    Get.off(FullApp());
  }
}

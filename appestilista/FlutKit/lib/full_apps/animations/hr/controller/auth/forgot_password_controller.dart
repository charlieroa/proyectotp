import 'package:flutkit/full_apps/animations/hr/views/auth/reset_password_screen.dart';
import 'package:flutkit/helpers/utils/my_string_utils.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import 'package:flutkit/full_apps/animations/hr/views/auth/register_screen.dart';

class ForgotPasswordController extends GetxController {
  TextEditingController emailController = TextEditingController();
  GlobalKey<FormState> formKey = GlobalKey();

  @override
  void onInit() {
    emailController = TextEditingController(text: 'flutkit@coderthemes.com');
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

  void forgotPassword() {
    if (formKey.currentState!.validate()) {
      Get.off(ResetPasswordScreen());
    }
  }

  void goToRegisterScreen() {
    Get.off(RegisterScreen());
  }
}

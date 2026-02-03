import 'package:flutkit/full_apps/animations/smart_shopping/views/auth/reset_password_screen.dart';
import 'package:flutkit/helpers/utils/my_string_utils.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class ForgotPasswordController extends GetxController {
  late TextEditingController emailTE;
  GlobalKey<FormState> formKey = GlobalKey();

  @override
  void onInit() {
    emailTE = TextEditingController(text: 'flutkit@coderthemes.com');
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

  void goToResetPasswordScreen() {
    if (formKey.currentState!.validate()) {
      Get.off(ResetPasswordScreen());
    }
  }

}
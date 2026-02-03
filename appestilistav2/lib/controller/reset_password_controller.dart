import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';

class ResetPasswordController extends GetxController {
  TextEditingController passwordController = TextEditingController();
  TextEditingController confirmPasswordController = TextEditingController();
  final resetFormKey = GlobalKey<FormState>();
  final RxBool isValid = false.obs;
  final RxBool isConfirmPasswordValid = false.obs;
  RxBool isPasswordVisible = false.obs;
  @override
  void onInit() {
    super.onInit();
    passwordController.addListener(() {
      isValid.value = passwordController.text.isNotEmpty &&
          confirmPasswordController.text.isNotEmpty;
    });
    confirmPasswordController.addListener(() {
      isValid.value = confirmPasswordController.text.isNotEmpty &&
          confirmPasswordController.text.isNotEmpty;
    });
  }

  void togglePasswordVisibility() {
    isPasswordVisible.toggle();
  }

  void togglePasswordVisibility2() {
    isConfirmPasswordValid.toggle();
  }
}

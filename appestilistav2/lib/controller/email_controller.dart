import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';

class EmailController extends GetxController{
  TextEditingController emailController=TextEditingController();
  final RxBool isValid = false.obs;
  final formKey = GlobalKey<FormState>();

  @override
  void onInit() {
    super.onInit();
    emailController.addListener(() {
      isValid.value = emailController.text.isNotEmpty && emailController.text.isNotEmpty;
    });
  }
}
import 'package:flutkit/full_apps/animations/plant/views/plant_profile_screen.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class PlantProfileEditController extends GetxController {
  late TextEditingController nameTE, emailTE, passwordTE, locationTE;
  late AnimationController arrowController,
      nameController,
      emailController,
      passwordController,
      locationController;
  late Animation<Offset> arrowAnimation,
      nameAnimation,
      emailAnimation,
      passwordAnimation,
      locationAnimation;

  @override
  void onInit() {
    nameTE = TextEditingController();
    emailTE = TextEditingController();
    passwordTE = TextEditingController();
    locationTE = TextEditingController();
    super.onInit();
  }

  void gotoProfile() {
    Get.off(PlantProfileScreen());
  }
}

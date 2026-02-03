import 'dart:async';

import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/storage_controller.dart';
import 'package:home_helper_flutter_ui_kit/services/api_service.dart';
import 'package:home_helper_flutter_ui_kit/view/bottom_screen/bottom_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/login_screen/login_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/onbording_screen/onbording_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SplashController extends GetxController {
  @override
  void onInit() {
    super.onInit();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // Cargar token si existe
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token != null) {
      ApiService.setToken(token);
    }

    Timer(const Duration(seconds: 4), () {
      _navigateToNextScreen();
    });
  }

  Future<void> _navigateToNextScreen() async {
    final isLoggedIn = await StorageController.instance.getLogin() ?? false;
    final isFirstTime = await StorageController.instance.getLoginFirst() ?? true;

    if (isLoggedIn) {
      // Usuario ya logueado, ir directamente a la pantalla principal
      Get.offAll(const BottomScreen(initialIndex: 0));
    } else if (isFirstTime) {
      // Primera vez, mostrar onboarding
      Get.off(OnBoardingScreen());
    } else {
      // Ya vio el onboarding, ir al login
      Get.off(LoginScreen(status: "onBoarding"));
    }
  }
}

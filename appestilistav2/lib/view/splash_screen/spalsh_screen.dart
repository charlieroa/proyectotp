import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';

import '../../controller/dark_controller.dart';
import '../../controller/splash_controller.dart';

class SplashScreen extends StatelessWidget {
  SplashScreen({Key? key}) : super(key: key);
  final SplashController splashController = Get.put(SplashController());
  final DarkModeController darkModeController = Get.put(DarkModeController());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor:Theme.of(context).primaryColor,
      body: Center(
        child: Image.asset(
          AppImage.splashLogo,
          width: AppSize.width150,
        ),
      ),
    );
  }
}

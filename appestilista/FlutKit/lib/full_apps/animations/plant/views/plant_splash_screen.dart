import 'package:flutkit/full_apps/animations/plant/controller/plant_splash_controller.dart';
import 'package:flutkit/full_apps/animations/plant/plant_cache.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_login_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class PlantSplashScreen extends StatefulWidget {
  const PlantSplashScreen({super.key});

  @override
  State<PlantSplashScreen> createState() => _PlantSplashScreenState();
}

class _PlantSplashScreenState extends State<PlantSplashScreen> {
  late PlantSplashController controller;

  @override
  void initState() {
    controller = Get.put(PlantSplashController());
    PlantCache.initDummy();
    Future.delayed(
      Duration(seconds: 1),
      () => Get.off(
        () => PlantLoginScreen(),
      ),
    );
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder(
      init: controller,
      tag: 'plant_splash_controller',
      builder: (controller) {
        return Scaffold(
          body: MyContainer.none(
            height: double.infinity,
            clipBehavior: Clip.antiAliasWithSaveLayer,
            child: Stack(
              alignment: Alignment.bottomCenter,
              children: [
                MyContainer(
                  paddingAll: 0,
                  height: double.infinity,
                  borderRadiusAll: 0,
                  clipBehavior: Clip.antiAliasWithSaveLayer,
                  child: Image.asset(
                    Images.plantSplash,
                    fit: BoxFit.cover,
                  ),
                ),
                Positioned(
                  bottom: 20,
                  child: Column(
                    children: [
                      MyText.titleLarge(
                        'PLANT A TREE &\nGREEN THE EARTH',
                        textAlign: TextAlign.center,
                        fontWeight: 600,
                        fontSize: 24,
                        color: AppTheme.plantTheme.colorScheme.surface,
                      ),
                      MySpacing.height(16),
                      MyText.bodySmall(
                        "We'll keep you updated on plants to-do\nlist to make sure you are on track",
                        textAlign: TextAlign.center,
                        fontWeight: 600,
                        color: AppTheme.plantTheme.colorScheme.surface,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

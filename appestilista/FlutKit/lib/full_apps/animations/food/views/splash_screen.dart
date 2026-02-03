import 'package:flutkit/helpers/theme/app_notifier.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:provider/provider.dart';

import 'package:flutkit/full_apps/animations/food/controllers/splash_controller.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late SplashController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;
    controller = Get.put(SplashController());
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppNotifier>(
        builder: (BuildContext context, AppNotifier value, Widget? child) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: theme.copyWith(
            colorScheme: theme.colorScheme
                .copyWith(secondary: customTheme.foodPrimary.withAlpha(40))),
        builder: (context, child) {
          return Directionality(
              textDirection: AppTheme.textDirection, child: child!);
        },
        home: GetBuilder<SplashController>(
            init: controller,
            tag: 'food_splash_controller',
            builder: (controller) {
              return Scaffold(
                body: MyContainer(
                  marginAll: 0,
                  padding: MySpacing.nBottom(20),
                  height: MediaQuery.of(context).size.height,
                  width: MediaQuery.of(context).size.width,
                  color: customTheme.foodPrimary.withAlpha(30),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Image(
                        image: AssetImage(Images.foodSplash),
                      ),
                      MySpacing.height(20),
                      MyButton.block(
                        onPressed: () => controller.goToLogInScreen(),
                        elevation: 0,
                        borderRadiusAll: 8,
                        backgroundColor: customTheme.foodPrimary,
                        splashColor: customTheme.foodOnPrimary.withAlpha(60),
                        child: MyText.labelLarge(
                          'Get Started',
                          color: customTheme.foodOnPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
      );
    });
  }
}

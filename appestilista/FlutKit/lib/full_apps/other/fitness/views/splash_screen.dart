import 'package:flutkit/full_apps/other/fitness/controllers/splash_controller.dart';
import 'package:flutkit/helpers/theme/app_notifier.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  _SplashScreenState createState() => _SplashScreenState();
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

    // FxControllerStore.resetStore();
    controller = SplashController();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AppNotifier>(
        builder: (BuildContext context, AppNotifier value, Widget? child) {
      return MaterialApp(
        debugShowCheckedModeBanner: false,
        // debugShowMaterialGrid: true,
        theme: theme.copyWith(
            colorScheme: theme.colorScheme
                .copyWith(secondary: customTheme.fitnessPrimary.withAlpha(40))),
        builder: (context, child) {
          return Directionality(
              textDirection: AppTheme.textDirection, child: child!);
        },
        home: Scaffold(
          body: Padding(
            padding: MySpacing.x(20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                MyContainer(
                  height: 400,
                  width: 300,
                  color: customTheme.fitnessPrimary.withAlpha(30),
                  clipBehavior: Clip.antiAliasWithSaveLayer,
                  child: Image.asset(
                    Images.fitnessSplash,
                    fit: BoxFit.cover,
                  ),
                ),
                MySpacing.height(24),
                MyText.displaySmall(
                  'Energize your life!',
                  fontWeight: 700,
                ),
                MySpacing.height(16),
                MyText.bodyMedium(
                  'If you want to be a hit in life, \nyou gotta be fit and fine.',
                  textAlign: TextAlign.center,
                ),
                MySpacing.height(40),
                MyButton.block(
                  onPressed: () {
                    controller.goToLogInScreen();
                  },
                  backgroundColor: customTheme.fitnessPrimary,
                  elevation: 0,
                  borderRadiusAll: 4,
                  padding: MySpacing.y(20),
                  child: MyText.labelMedium(
                    'Get Started',
                    fontWeight: 600,
                    color: customTheme.fitnessOnPrimary,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }
}

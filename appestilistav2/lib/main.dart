import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:get_storage/get_storage.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/controller/storage_controller.dart';
import 'package:home_helper_flutter_ui_kit/localization/app_translation.dart';
import 'package:home_helper_flutter_ui_kit/theme/themes.dart';
import 'package:home_helper_flutter_ui_kit/view/splash_screen/spalsh_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'controller/dark_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await GetStorage.init();
  
  // Inicializar formato de fechas para español y otros locales
  await initializeDateFormatting('es', null);
  await initializeDateFormatting('en', null);
  
  SystemChrome.setPreferredOrientations(
      [DeviceOrientation.portraitUp, DeviceOrientation.portraitDown]);
  String? languageCode = await StorageController.instance.getLanguage();
  String? countryCode = await StorageController.instance.getCountryCode();
  runApp(MyApp(
    languageCode: languageCode,
    countryCode: countryCode,
  ));
}

class MyApp extends StatefulWidget {
  const MyApp({super.key, this.languageCode, this.countryCode});

  final String? languageCode;
  final String? countryCode;

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  DarkModeController darkModeController = Get.put(DarkModeController());

  ThemeData lightTheme = ThemeData(
    useMaterial3: false,
    brightness: Brightness.light,
    primaryColor: AppColor.whiteColor,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColor.whiteColor,
      surface: AppColor.whiteColor,
    ),
  );

  ThemeData darkTheme = ThemeData(
    useMaterial3: false,
    brightness: Brightness.dark,
    appBarTheme: const AppBarTheme(
        titleTextStyle: TextStyle(color: AppColor.whiteColor),
        color: AppColor.blackColor),
  );
  bool isUserLoggedIn = false;
  bool isUserOpenFirstTime = false;
  late bool showBottomSheet;

  @override
  void initState() {
    super.initState();
    darkModeController.getThemeStatus();
    checkFirstTimeVisit();
    Future.delayed(
      const Duration(seconds: 0),
      () async {
        isUserLoggedIn = await StorageController.instance.getLogin() ?? false;
        isUserOpenFirstTime =
            await StorageController.instance.getLoginFirst() ?? true;
        setState(() {});
      },
    );
  }

  Future<void> checkFirstTimeVisit() async {
    SharedPreferences prefs = await SharedPreferences.getInstance();
    bool firstTimeVisit = prefs.getBool('first_time_visit') ?? true;

    setState(() {
      showBottomSheet = firstTimeVisit;
    });

    if (firstTimeVisit) {
      prefs.setBool('first_time_visit', true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Obx(
      () {
        final theme = darkModeController.isLightTheme.value
            ? AppTheme.light()
            : AppTheme.dark();

        return GetMaterialApp(
          color: AppColor.whiteColor,
          translationsKeys: AppTranslation.translationsKeys,
          locale:
              Locale(widget.languageCode ?? "en", widget.countryCode ?? "US"),
          debugShowCheckedModeBanner: false,
          theme: theme.themeData,
          themeMode: ThemeMode.system,
          home: SplashScreen(),
        );
      },
    );
  }
}

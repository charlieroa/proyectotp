import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_icons.dart';
import 'package:home_helper_flutter_ui_kit/controller/storage_controller.dart';

import '../config/app_string.dart';

class LanguageController extends GetxController {
  RxInt selectedContainerIndex = (-1).obs;
  @override
  void onInit() {
    super.onInit();
    initializeController();
    loadSelectedLanguage();
  }

  void selectContainer(int index) {
    if (selectedContainerIndex.value == index) {
      selectedContainerIndex.value = -1;
    } else {
      selectedContainerIndex.value = index;
    }
  }

  String getContainerImage(int index) {
    return selectedContainerIndex.value == index
        ? AppIcons.fillRound
        : AppIcons.emptyRound;
  }

  RxList languagesList = [
    AppString.english,
    AppString.arabic,
    AppString.chinese,
    AppString.german,
    AppString.french,
    AppString.hindi,
  ].obs;

  RxString languageName = "English".obs;
  RxBool arb= false.obs;
  RxString language = "English".obs;
  Future<void> initializeController() async {
    var lng = await StorageController.instance.getLang() ?? "";

    languageName.value = lng.isNotEmpty ? lng : 'English';
  }
  Future<void> changeLanguage({String? language}) async {
    Locale locale;
    switch (language) {
      case 'English':
        locale = const Locale('en', 'US');
        await StorageController.instance.setLang('English');
        await StorageController.instance.setLanguage('en');
        await StorageController.instance.setCountryCode('US');
        languageName.value = 'English';
        break;
      case 'Hindi':
        locale = const Locale('hi', 'IN');
        await StorageController.instance.setLang('Hindi');
        await StorageController.instance.setLanguage('hi');
        await StorageController.instance.setCountryCode('IN');
        languageName.value = 'Hindi';
        break;
      case 'Arabic':
        locale = const Locale('ar', 'SA');
        await StorageController.instance.setLang('Arabic');
        await StorageController.instance.setLanguage('ar');
        await StorageController.instance.setCountryCode('SA');
        arb.value = true;
        languageName.value = 'Arabic';
        break;
      case 'Chinese':
        locale = const Locale('zh', 'CN');
        await StorageController.instance.setLang('Chinese');
        await StorageController.instance.setLanguage('zh');
        await StorageController.instance.setCountryCode('CN');
        languageName.value = 'Chinese';
        break;
      case 'French':
        locale = const Locale('fr', 'FR');
        await StorageController.instance.setLang('French');
        await StorageController.instance.setLanguage('fr');
        await StorageController.instance.setCountryCode('FR');
        languageName.value = 'French';
        break;
      case 'German':
        locale = const Locale('de', 'DE');
        await StorageController.instance.setLang('German');
        await StorageController.instance.setLanguage('de');
        await StorageController.instance.setCountryCode('DE');
        languageName.value = 'German';
        break;
      case '':
        locale = const Locale('en', 'US');
        await StorageController.instance.setLang('English');
        await StorageController.instance.setLanguage('en');
        await StorageController.instance.setCountryCode('US');
        languageName.value = 'English';
        break;

      default:
        locale = const Locale('en', 'US');
        await StorageController.instance.setLang('English');
        languageName.value = 'English';
    }

    Get.updateLocale(locale);
  }
  void loadSelectedLanguage() async {
    language.value = await StorageController.instance.getLanguage() ?? "";
    language.value == "Arabic" || language.value == 'ar'
        ? arb.value = true
        : arb.value = false;
  }
}

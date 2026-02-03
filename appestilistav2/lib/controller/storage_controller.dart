import 'package:shared_preferences/shared_preferences.dart';

class StorageController {
  static final instance = StorageController();
  String isUserLoggedInKey = "isUserLoggedIn";
  String isUserLoggedInFirstTime = "isUserLoggedInFirstTime";
  String languageCode = "languageCode";
  String countryCode = "countryCode";
  String lng = "language";

  Future<void> setLogIn(bool value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setBool(isUserLoggedInKey, value);
  }

  Future<bool?> getLogin() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getBool(isUserLoggedInKey);
  }

  Future<void> setLogInFirst(bool value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setBool(isUserLoggedInFirstTime, value);
  }

  Future<bool?> getLoginFirst() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getBool(isUserLoggedInFirstTime);
  }

  Future<String?> getLang() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(lng);
  }

  Future<void> setLang(String value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString(lng, value);
  }

  Future<void> setLanguage(String value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString(languageCode, value);
  }

  Future<String?> getLanguage() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(languageCode);
  }

  Future<void> setCountryCode(String value) async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    prefs.setString(countryCode, value);
  }

  Future<String?> getCountryCode() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    return prefs.getString(countryCode);
  }
}

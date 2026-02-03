import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/theme/theme_type.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

import 'package:flutkit/full_apps/animations/food/views/checkout_screen.dart';

class TrackOrderController extends GetxController {
  bool showLoading = true, uiLoading = true;
  GoogleMapController? mapController;
  final LatLng center = const LatLng(45.521563, -122.677433);
  String? mapStyle;

  void onMapCreated(GoogleMapController controller) {
    mapController = controller;
    setMapTheme();
  }

  @override
  void onInit() {
    fetchData();
    super.onInit();
  }


  void fetchData() async {
    await Future.delayed(Duration(seconds: 1));
    showLoading = false;
    uiLoading = false;
    update();
  }

  Future<void> setMapTheme() async {
    if (AppTheme.themeType == ThemeType.dark) {
       mapStyle = await rootBundle
           .loadString('assets/map/map-dark-style.txt');
      update();
    }
  }

  void goToCheckoutScreen() {
    Get.to(CheckoutScreen());
  }

  void goBack() {
    Get.back();
  }

}

import 'package:flutkit/full_apps/animations/food/views/track_order_screen.dart';
import 'package:get/get.dart';

class OrderSuccessController extends GetxController {
  bool showLoading = true, uiLoading = true;

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

  void goBack() {
    Get.back();
  }

  void goToTrackOrderScreen() {
    Get.to(TrackOrderScreen());
  }
}

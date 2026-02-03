import 'package:flutkit/full_apps/animations/food/views/checkout_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/edit_profile_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/order_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/splash_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/subscription_screen.dart';
import 'package:get/get.dart';

class ProfileController extends GetxController {
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

  void goToOrderScreen() {
    Get.to(OrderScreen());
  }

  void goToEditProfileScreen() {
    Get.to(EditProfileScreen());
  }

  void goToSplashScreen() {
    Get.offAll(SplashScreen());
  }

  void goToCheckoutScreen() {
    Get.to(CheckoutScreen());
  }

  void goToSubscriptionScreen() {
    Get.to(SubscriptionScreen());
  }
}

import 'package:flutkit/full_apps/other/fitness/views/login_screen.dart';
import 'package:get/get.dart';

class SplashController extends GetxController {
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

  void goToLogInScreen() {
    Get.to(LogInScreen());
    // Navigator.push(
    //   context,
    //   MaterialPageRoute(
    //     builder: (context) => LogInScreen(),
    //   ),
    // );
  }
}

import 'package:get/get.dart';

class PaymentController extends GetxController {
  final isImageToggled = false.obs;
  RxInt currentIndex = 0.obs;

  void toggleImage() {
    isImageToggled.value = !isImageToggled.value;
  }
}
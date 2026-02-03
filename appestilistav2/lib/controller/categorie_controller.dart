import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';

class Categories extends GetxController {
  RxList colorList = [
    AppColor.salonBgColor,
    AppColor.spaBgColor,
    AppColor.plumberBgColor,
    AppColor.carpenterBgColor,
    AppColor.electricianBgColor,
    AppColor.cleaningBgColor,
    AppColor.repairingBgColor,
    AppColor.paintingBgColor,
    AppColor.washingBgColor,
  ].obs;
}

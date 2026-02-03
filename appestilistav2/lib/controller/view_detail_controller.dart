import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';

class ViewDetailController extends GetxController {
  RxBool showShadow = false.obs;
  RxInt values = 0.obs;
  void updateShowShadow(bool value) {
    showShadow.value = value;
  }

  RxBool showContainer = false.obs;
  var value = 1.obs;
  void toggleVisibility() {
    showContainer.value = !showContainer.value;
  }

  void increment() {
    value++;
  }

  void decrement() {
    value--;
  }

  RxList viewDetailReviewTitle = [
    AppString.milesEsther,
    AppString.nguyenShane,
    AppString.cooperKristin,
    AppString.henryArthur,
    AppString.blackMarvin,
    AppString.floresJuanita,
  ].obs;
  RxList viewDetailReviewTime = [
    AppString.jan2022,
    AppString.feb2023,
    AppString.feb2023,
    AppString.mar2023,
    AppString.july2023,
    AppString.july2023,
  ].obs;
  RxList viewDetailReviewDescription = [
    AppString.absolutelyThrilledWith,
    AppString.justGotAHaircut,
    AppString.justGotAHaircutCooperKristin,
    AppString.justGotAHaircutHenryArthur,
    AppString.iAbsolutelyLove,
    AppString.iRecentlyGotAHaircut,
  ].obs;
  RxList viewDetailReviews = [
    AppString.five,
    AppString.four,
    AppString.four,
    AppString.two,
    AppString.three,
    AppString.one,
  ].obs;
  RxList viewDetailReviewsImage = [
    AppImage.milesEsther,
    AppImage.nguyenShane,
    AppImage.cooperKristin,
    AppImage.henryArther,
    AppImage.blackMarvin,
    AppImage.floresJuanita,
  ].obs;
}

import 'package:get/get.dart';

import '../config/app_image.dart';
import '../config/app_string.dart';

class PopularServicesController extends GetxController {
  RxBool showShadow = false.obs;

  void updateShowShadow(bool value) {
    showShadow.value = value;
  }

  RxList popularServiceImageList = [
    AppImage.cleaningServices,
    AppImage.haiCutMan,
    AppImage.spaServices,
    AppImage.fanRepairPopularService,
    AppImage.homeCleaning,
    AppImage.acRepair,
    AppImage.cleaningServices,
    AppImage.haiCutMan,
  ].obs;
  RxList popularServiceStringList = [
    AppString.cleaningServices,
    AppString.hairCutForMane,
    AppString.spaServices,
    AppString.fanRepair,
    AppString.homeCleaning,
    AppString.acRepair,
    AppString.cleaningServices,
    AppString.hairCutForMane,
  ].obs;
  RxList popularServiceStringRateList = [
    AppString.reviewsRate,
    AppString.reviewsRate,
    AppString.reviewsRate,
    AppString.reviewsRate,
    AppString.reviewsRate,
    AppString.reviewsRate,
    AppString.reviewsRate,
    AppString.reviewsRate,
  ].obs;
  RxList popularServiceStringReviewsList = [
    AppString.reviews1,
    AppString.reviews1,
    AppString.reviews1,
    AppString.reviews1,
    AppString.reviews1,
    AppString.reviews1,
    AppString.reviews1,
    AppString.reviews1,
  ].obs;
  RxList price = [
    AppString.price,
    AppString.price1,
    AppString.spaPrice120,
    AppString.spaPrice600,
    AppString.spaPrice190,
    AppString.spaPrice300,
    AppString.price,
    AppString.price1,
  ].obs;
  RxList price2 = [
    AppString.price1,
    AppString.price1,
    AppString.price1,
    AppString.price1,
    AppString.price1,
    AppString.price1,
    AppString.price1,
    AppString.price1,
  ].obs;
}

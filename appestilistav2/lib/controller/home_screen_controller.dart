import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';

import '../config/app_color.dart';

class HomeScreenController extends GetxController {

  RxInt pageViewIndex = 0.obs;
  TextEditingController searchController = TextEditingController();
  TextEditingController searchBottomController = TextEditingController();
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
  RxList nameList = [
    AppString.salon,
    AppString.spa,
    AppString.plumber,
    AppString.carpenter,
    AppString.electrician,
    AppString.cleaning,
    AppString.repairing,
    AppString.painting,
    AppString.washing,
  ].obs;
  RxList imageList = [
    AppImage.salon,
    AppImage.spa,
    AppImage.plumber,
    AppImage.carpenter,
    AppImage.electrician,
    AppImage.cleaning,
    AppImage.repairing,
    AppImage.painting,
    AppImage.washing,
  ].obs;
  RxList popularServiceImageList = [
    AppImage.cleaningServices,
    AppImage.hairSalon,
    AppImage.cleaningServices,
  ].obs;
  RxList popularServiceStringList = [
    AppString.cleaningServices,
    AppString.hairSalonServices,
    AppString.cleaningServices,
  ].obs;
  RxList popularServiceStringRateList = [
    AppString.reviewsRate,
    AppString.reviewsRate,
    AppString.reviewsRate,
  ].obs;
  RxList popularServiceStringReviewsList = [
    AppString.reviews1,
    AppString.reviews2,
    AppString.reviews1,
  ].obs;
  RxList price = [
    AppString.price,
    AppString.price1,
    AppString.price,
  ].obs;
  RxList price2 = [
    AppString.price1,
    AppString.price2,
    AppString.price1,
  ].obs;
  RxList beautyTherapyIMG = [
    AppImage.beautyTherapy,
    AppImage.relaxTherapy,
    AppImage.beautyTherapy,
    AppImage.relaxTherapy,
  ].obs;
  RxList beautyTherapyName = [
    AppString.beautyTherapy,
    AppString.relaxTherapy,
    AppString.beautyTherapy,
    AppString.relaxTherapy,
  ].obs;
  RxList salonForKidsManIMG = [
    AppImage.hairCut,
    AppImage.cleanShave,
    AppImage.hairCut,
    AppImage.cleanShave,
  ].obs;
  RxList salonForKidsManName = [
    AppString.hairCut,
    AppString.cleanShave,
    AppString.hairCut,
    AppString.cleanShave,
  ].obs;
  RxList acRepairIMG = [
    AppImage.acRepair,
    AppImage.acRepair1,
    AppImage.acRepair,
    AppImage.acRepair1,
  ].obs;
  RxList acServicesName = [
    AppString.acServices,
    AppString.acServicesGasFilling,
    AppString.acServices,
    AppString.acServicesGasFilling,
  ].obs;
  RxList quickHomeService = [
    AppString.tapRepair,
    AppString.fanRepair,
    AppString.tapRepair,
    AppString.fanRepair,
  ].obs;
  RxList tapRepair = [
    AppImage.tapRepair,
    AppImage.fanRepair,
    AppImage.tapRepair,
    AppImage.fanRepair,
  ].obs;
  RxList tapRepairReviews = [
    AppString.review4,
    AppString.reviewsRate,
    AppString.review4,
    AppString.reviewsRate,
  ].obs;
  RxList tapRepairReviewsList = [
    AppString.reviews,
    AppString.review1,
    AppString.reviews,
    AppString.review1,
  ].obs;
  RxList prices = [
    AppString.reviews,
    AppString.review1,
    AppString.reviews,
    AppString.review1,
  ].obs;
  RxList quickHomePrices = [
    AppString.tapPrice,
    AppString.fanPrice,
    AppString.tapPrice,
    AppString.fanPrice,
  ].obs;
  RxList quickHomeServices = [
    AppString.tapRepair,
    AppString.fanRepair,
    AppString.tapRepair,
    AppString.fanRepair,
  ].obs;
}

import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/storage_controller.dart';

import '../config/app_color.dart';
import '../config/app_image.dart';
import '../config/app_string.dart';

class SalonScreenController extends GetxController {
  final ScrollController scrollController = ScrollController();
  final RxBool isScrolled = false.obs;
  final RxBool isUserLoggedIn = false.obs;
  RxBool isMyCart = true.obs;
  @override
  void onInit() {
    super.onInit();
    Future.delayed(
      const Duration(seconds: 0),
      () async {
        getUserinfo();
      },
    );
  }

  void toggleContent() {
    isMyCart.toggle();
  }

  Future<void> getUserinfo() async {
    isUserLoggedIn.value = await StorageController.instance.getLogin() ?? false;
  }

  RxBool isSliverAppBarExpanded = false.obs;

  final RxBool isAppBarVisible = false.obs;
  final ScrollController scrollControllerAppBar = ScrollController();
  var isButtonHighlighted = false.obs;
  var selectedHaircutIndex = -1.obs;
  RxBool showShadow = false.obs;
  var value = 0.obs;
  var value2 = 0.obs;
  RxBool showContainer = false.obs;
  RxBool showContainer2 = false.obs;

  var hasIncremented = false.obs;
  RxInt values = 1.obs;

  final RxBool isHaircutTap = false.obs;
  final RxBool isIDonNeed = false.obs;
  RxList allImage = [].obs;

  final RxBool isRegularMassageTap = false.obs;
  final RxBool isRelaxMassageTap = false.obs;
  final RxBool isHeadMassageTap = false.obs;
  final RxBool isDonNeedMassage = false.obs;

  final RxBool isBeardGroomingTap = false.obs;
  final RxBool isIDonNeedBeardGrooming = false.obs;
  final RxBool recentTap = false.obs;
  final RxBool mostDetailTap = false.obs;

  void toggleVisibility() {
    showContainer.value = !showContainer.value;
  }

  void increment() {
    value++;
  }

  void decrement() {
    value--;
  }

  void toggleVisibility2() {
    showContainer2.value = !showContainer2.value;
  }

  void increment2() {
    value2++;
  }

  void decrement2() {
    value2--;
  }

  void updateShowShadow(bool value) {
    showShadow.value = value;
  }

  RxInt pageViewIndex = 0.obs;
  RxList colorList = [
    AppColor.salonBgColor,
    AppColor.spaBgColor,
    AppColor.plumberBgColor,
    AppColor.repairingBgColor,
    AppColor.washingBgColor,
  ].obs;
  RxList nameList = [
    AppString.hairCut,
    AppString.faceCare,
    AppString.shave,
    AppString.beardGrooming,
    AppString.massage,
  ].obs;
  RxList imageList = [
    AppImage.haircutSalon,
    AppImage.faceCareSalon,
    AppImage.shaveSalon,
    AppImage.beardGroomingSalon,
    AppImage.massageSalon,
  ].obs;
  RxList offerList = [
    AppString.off10,
    AppString.off50,
  ].obs;
  RxList hairCutReviewsText = [
    AppString.reviews1,
    AppString.reviews1,
  ].obs;
  RxList massageDetail = [
    AppString.relaxingMassage,
    AppString.pedicureDetail,
  ].obs;
  RxList haircutTitle = [
    AppString.hairCutForMane,
    AppString.hairCutForKids,
  ].obs;
  RxList reviewHairCut = [
    AppString.reviewsRate,
    AppString.reviewsRate,
  ].obs;
  RxList haircutPrice1 = [
    AppString.price1,
    AppString.price120,
  ].obs;
  RxList haircutPrice2 = [
    AppString.price200,
    AppString.price1,
  ].obs;
  RxList hairCutDescription = [
    AppString.professionalHaircut,
    AppString.professionalHaircut,
  ].obs;

  RxList faceCareTitle = [
    AppString.tanReductionMask,
  ].obs;
  RxList review45 = [
    AppString.reviewsRate,
  ].obs;
  RxList reviewsDetail = [
    AppString.reviews1,
  ].obs;
  RxList faceCareDetail = [
    AppString.faceCareDetail,
  ].obs;
  RxList faceCarePrice1 = [
    AppString.price149,
  ].obs;
  RxList faceCarePrice2 = [
    AppString.price200,
  ].obs;
  RxList hairCutImage = [
    AppImage.hairCutManSalon,
    AppImage.hairCutKids,
  ].obs;
  RxList faceCareImage = [
    AppImage.faceCareImg,
  ].obs;
  RxList cleanShaveTitle = [
    AppString.cleanShaveTextSalon,
  ].obs;
  RxList cleanShaveReview45 = [
    AppString.reviewsRate,
  ].obs;
  RxList cleanShaveReviewsDetail = [
    AppString.reviews2,
  ].obs;
  RxList cleanShavePrice1 = [
    AppString.price120,
  ].obs;
  RxList cleanShavePrice2 = [
    AppString.price1,
  ].obs;
  RxList cleanShaveDetail = [
    AppString.cleanShaveDetail,
  ].obs;
  RxList cleanShaveImage = [
    AppImage.cleanShaveImg,
  ].obs;
  RxList beardTrimmingTitle = [
    AppString.beardTrimming,
  ].obs;
  RxList beardTrimmingReview45 = [
    AppString.reviewsRate,
  ].obs;
  RxList beardTrimmingReviewsDetail = [
    AppString.reviews1,
  ].obs;
  RxList beardTrimmingPrice1 = [
    AppString.price100,
  ].obs;
  RxList beardTrimmingPrice2 = [
    AppString.price120,
  ].obs;
  RxList beardTrimmingDetail = [
    AppString.trimYourBeard,
  ].obs;
  RxList massageTitle = [
    AppString.faceMassage,
    AppString.headMassage,
  ].obs;
  RxList massageReview45 = [
    AppString.reviewsRate,
    AppString.reviewsRate,
  ].obs;
  RxList massageReviewsDetail = [
    AppString.reviews1,
    AppString.reviews1,
  ].obs;
  RxList massagePrice1 = [
    AppString.price1,
    AppString.price120,
  ].obs;
  RxList massagePrice2 = [
    AppString.price200,
    AppString.price1,
  ].obs;
  RxList massageDetailSalon = [
    AppString.massageDetail1,
    AppString.massageDetail,
  ].obs;
  RxList massageImg = [
    AppImage.massageImg1,
    AppImage.massageImg2,
  ].obs;
}

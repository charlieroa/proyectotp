import 'package:get/get.dart';

import '../config/app_string.dart';

class NotificationController extends GetxController {
  RxBool showShadow = false.obs;

  void updateShowShadow(bool value) {
    showShadow.value = value;
  }
  RxList notificationTitle = [
    AppString.newUpdateAvailable,
    AppString.yourPayment,
    AppString.checkFestival,
    AppString.newOffers,
    AppString.yourPaymentReceived,
  ].obs;
  RxList notificationDescription = [
    AppString.excitingNews,
    AppString.ifYouHaveSetUp,
    AppString.donMissOut,
    AppString.newOffersAlert,
    AppString.ifYouHaveSetUpAutomatic,
  ].obs;
  RxList notificationDay = [
    AppString.today,
    AppString.today,
    AppString.today,
    AppString.yesterday,
    AppString.yesterday,
  ].obs;
  RxList notificationTime = [
    AppString.time12PM,
    AppString.time13PM,
    AppString.time15PM,
    AppString.time1AM,
    AppString.time10Am,
  ].obs;
}

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import 'package:home_helper_flutter_ui_kit/config/font_family.dart';
import 'package:home_helper_flutter_ui_kit/view/login_screen/login_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/my_cart_screen/slot_screen.dart';
import '../../config/app_color.dart';
import '../../controller/salon_screen_controller.dart';
import '../../custom_widget/common_button.dart';
import '../../theme/themes.dart';

class MyCartScreen extends StatelessWidget {
  final int? currentIndex;
  MyCartScreen({super.key, this.currentIndex}) {
    salonScreenController = Get.put(SalonScreenController());
    salonScreenController.getUserinfo();
  }

  late final SalonScreenController salonScreenController;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
        backgroundColor: Theme.of(context).primaryColor,
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(kToolbarHeight),
          child: Container(
            decoration: BoxDecoration(
              boxShadow: [
                BoxShadow(
                  color: Theme.of(context).appBarTheme.shadowColor!,
                  spreadRadius: AppSize.height0,
                  blurRadius: AppSize.height14,
                  offset: const Offset(
                    AppSize.height0,
                    AppSize.height4,
                  ),
                ),
              ],
            ),
            child: AppBar(
              shadowColor: Theme.of(context).appBarTheme.shadowColor,
              backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
              centerTitle: false,
              automaticallyImplyLeading: false,
              title: Text(
                AppString.myCart,
                style: TextStyle(
                  fontFamily: FontFamily.mulishBold,
                  fontSize: AppSize.height18,
                  fontStyle: FontStyle.normal,
                  fontWeight: FontWeight.w700,
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                ),
              ),
            ),
          ),
        ),
        body: Padding(
            padding: const EdgeInsets.only(
              left: AppSize.height20,
              right: AppSize.height20,
              top: AppSize.height24,
            ),
            child: Obx(() => salonScreenController.isMyCart.value
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      cartEmptyImg(context),
                      const SizedBox(height: AppSize.height18),
                      yourCartEmptyText(context)
                    ],
                  )
                : Column(
                    mainAxisAlignment: MainAxisAlignment.start,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      haircutForMenCard(context),
                      haircutForKidsCard(context),
                      paymentSummary(context),
                      const Spacer(),
                      if (salonScreenController.isUserLoggedIn.value)
                        continueButton(),
                      if (!salonScreenController.isUserLoggedIn.value)
                        logInSignUpButton(),
                      const SizedBox(height: AppSize.height18),
                    ],
                  ))));
  }

  Widget cartEmptyImg(context) {
    return Center(
      child: Image.asset(
        ((Theme.of(context).extensions.values.firstWhere(
                  (extension) => extension is RegistrationStyle,
                  orElse: () => const RegistrationStyle(
                      iconBuilder: "",
                      logoBuilder: "",
                      bannerBuilder: "",
                      imageBuilder: "",
                      radioBuilder: '',
                      radioBuilder2: '',
                      frameBuilder: '',
                      checkBuilder: '',
                      checkDoneBuilder: ''),
                ) as RegistrationStyle)
            .imageBuilder),
        height: AppSize.height78,
        width: AppSize.width93,
      ),
    );
  }

  Widget yourCartEmptyText(context) {
    return Text(
      AppString.yourCartIsEmpty,
      style: TextStyle(
          fontFamily: FontFamily.mulishSemiBold,
          fontSize: AppSize.height16,
          fontWeight: FontWeight.w600,
          fontStyle: FontStyle.normal,
          color: Theme.of(context).unselectedWidgetColor),
    );
  }

  Widget hairCutForMan() {
    return Container(
      height: AppSize.height96,
      decoration: BoxDecoration(
        color: AppColor.whiteColor,
        border: Border.all(
          color: AppColor.boxShadowColor,
        ),
        borderRadius: BorderRadius.circular(12),
      ),
    );
  }

  haircutForMenCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSize.height18),
      width: AppSize.width,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: Theme.of(context).cardColor,
        border: Border.all(color: Theme.of(context).cardTheme.shadowColor!),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
              AppSize.height0,
              AppSize.height4,
            ),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                AppString.hairCutForMane,
                textAlign: TextAlign.start,
                style: TextStyle(
                    fontSize: AppSize.height16,
                    fontStyle: FontStyle.normal,
                    fontFamily: FontFamily.mulishSemiBold,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color),
              ),
              const Spacer(),
              salonScreenController.value.value == 0
                  ? Obx(
                      () => GestureDetector(
                        onTap: () {
                          salonScreenController.toggleVisibility();
                          salonScreenController.showContainer.value = true;
                          salonScreenController.value.value == 0
                              ? salonScreenController.value.value = 1
                              : salonScreenController.value.value =
                                  salonScreenController.value.value;
                        },
                        child: Visibility(
                          visible: salonScreenController.value.value == 0
                              ? true
                              : !salonScreenController.showContainer.value,
                          child: Container(
                            alignment: Alignment.center,
                            height: AppSize.height32,
                            width: AppSize.width80,
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              border: Border.all(
                                  color:
                                      Theme.of(context).colorScheme.tertiary),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              AppString.add,
                              style: TextStyle(
                                  fontSize: AppSize.height14,
                                  color: AppColor.primaryColors,
                                  fontFamily: FontFamily.mulishBold,
                                  fontStyle: FontStyle.normal,
                                  fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ),
                    )
                  : Obx(
                      () => salonScreenController.value.value <= 0 ||
                              salonScreenController.showContainer.value == false
                          ? GestureDetector(
                              onTap: () {
                                salonScreenController.toggleVisibility();
                                salonScreenController.value.value = 1;
                                salonScreenController.value2.value = 1;
                              },
                              child: Visibility(
                                visible: true,
                                child: Container(
                                  alignment: Alignment.center,
                                  height: AppSize.height32,
                                  width: AppSize.width80,
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).cardColor,
                                    border: Border.all(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .tertiary),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    AppString.add,
                                    style: TextStyle(
                                        fontSize: AppSize.height14,
                                        color: AppColor.primaryColors,
                                        fontFamily: FontFamily.mulishBold,
                                        fontStyle: FontStyle.normal,
                                        fontWeight: FontWeight.w700),
                                  ),
                                ),
                              ),
                            )
                          : Visibility(
                              visible:
                                  salonScreenController.showContainer.value,
                              child: Container(
                                height: AppSize.height32,
                                width: AppSize.width80,
                                padding: const EdgeInsets.only(
                                    left: AppSize.height7,
                                    right: AppSize.height7),
                                decoration: BoxDecoration(
                                  color: AppColor.primaryColors,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    GestureDetector(
                                      child: const Icon(
                                        Icons.remove,
                                        size: AppSize.height14,
                                        color: AppColor.whiteColor,
                                      ),
                                      onTap: () {
                                        salonScreenController.decrement();
                                      },
                                    ),
                                    Obx(() => Text(
                                          '${salonScreenController.value}',
                                          style: const TextStyle(
                                              fontSize: AppSize.height14,
                                              color: AppColor.whiteColor,
                                              fontFamily: FontFamily.mulishBold,
                                              fontStyle: FontStyle.normal,
                                              fontWeight: FontWeight.w700),
                                        )),
                                    GestureDetector(
                                      child: const Icon(
                                        Icons.add,
                                        size: AppSize.height14,
                                        color: AppColor.whiteColor,
                                      ),
                                      onTap: () {
                                        salonScreenController.increment();
                                        salonScreenController
                                            .showContainer.value = true;
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            ),
                    )
            ],
          ),
          const SizedBox(height: AppSize.height6),
          Row(
            children: [
              Image.asset(
                AppImage.starIcon,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                height: AppSize.height12,
                width: AppSize.width12,
              ),
              const SizedBox(width: AppSize.height2),
              Text(
                AppString.reviewsRate,
                style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontSize: AppSize.height14,
                  fontWeight: FontWeight.w600,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishSemiBold,
                ),
              ),
              Container(
                width: AppSize.width6,
              ),
              Text(
                AppString.kreviews1_2,
                style: TextStyle(
                  color: Theme.of(context).textTheme.titleMedium?.color,
                  fontSize: AppSize.height14,
                  fontWeight: FontWeight.w400,
                  fontFamily: FontFamily.mulishRegular,
                  fontStyle: FontStyle.normal,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSize.height10),
          Row(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppString.price1,
                style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishBold,
                  fontWeight: FontWeight.w700,
                  fontSize: AppSize.height14,
                ),
              ),
              const SizedBox(width: AppSize.height4),
              Text(
                AppString.price200,
                style: TextStyle(
                  decoration: TextDecoration.lineThrough,
                  color: Theme.of(context).textTheme.titleMedium?.color,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishRegular,
                  fontWeight: FontWeight.w400,
                  fontSize: AppSize.height12,
                ),
              ),
              const Spacer(),
              Padding(
                padding: const EdgeInsets.only(right: AppSize.height14),
                child: GestureDetector(
                  onTap: () {
                    removeBottomSheet(context);
                  },
                  child: const Text(
                    AppString.remove,
                    style: TextStyle(
                      color: AppColor.primaryColorLightMode,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishRegular,
                      fontWeight: FontWeight.w400,
                      fontSize: AppSize.height14,
                    ),
                  ),
                ),
              )
            ],
          ),
        ],
      ),
    );
  }

  haircutForKidsCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(
        bottom: AppSize.height18,
      ),
      width: AppSize.width,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: Theme.of(context).cardColor,
        border: Border.all(color: Theme.of(context).cardTheme.shadowColor!),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
              AppSize.height0,
              AppSize.height4,
            ),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                AppString.hairCutForKids,
                textAlign: TextAlign.start,
                style: TextStyle(
                    fontSize: AppSize.height16,
                    fontStyle: FontStyle.normal,
                    fontFamily: FontFamily.mulishSemiBold,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color),
              ),
              const Spacer(),
              Obx(() => salonScreenController.value2.value == 0
                  ? Obx(
                      () => GestureDetector(
                        onTap: () {
                          salonScreenController.showContainer2.value = true;
                          salonScreenController.value2.value == 0
                              ? salonScreenController.value2.value = 1
                              : salonScreenController.value2.value =
                                  salonScreenController.value2.value;
                        },
                        child: Visibility(
                          visible: salonScreenController.value2.value == 0
                              ? true
                              : !salonScreenController.showContainer2.value,
                          child: Container(
                            alignment: Alignment.center,
                            height: AppSize.height32,
                            width: AppSize.width80,
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              border: Border.all(
                                  color:
                                      Theme.of(context).colorScheme.tertiary),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: const Text(
                              AppString.add,
                              style: TextStyle(
                                  fontSize: AppSize.height14,
                                  color: AppColor.primaryColors,
                                  fontFamily: FontFamily.mulishBold,
                                  fontStyle: FontStyle.normal,
                                  fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),
                      ),
                    )
                  : Obx(
                      () => salonScreenController.value2.value <= 0 ||
                              salonScreenController.showContainer2.value ==
                                  false
                          ? GestureDetector(
                              onTap: () {
                                salonScreenController.value2.value = 1;
                              },
                              child: Visibility(
                                visible: true,
                                child: Container(
                                  alignment: Alignment.center,
                                  height: AppSize.height32,
                                  width: AppSize.width80,
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).cardColor,
                                    border: Border.all(
                                        color: Theme.of(context)
                                            .colorScheme
                                            .tertiary),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text(
                                    AppString.add,
                                    style: TextStyle(
                                        fontSize: AppSize.height14,
                                        color: AppColor.primaryColors,
                                        fontFamily: FontFamily.mulishBold,
                                        fontStyle: FontStyle.normal,
                                        fontWeight: FontWeight.w700),
                                  ),
                                ),
                              ),
                            )
                          : Visibility(
                              visible: true,
                              child: Container(
                                height: AppSize.height32,
                                width: AppSize.width80,
                                padding: const EdgeInsets.only(
                                    left: AppSize.height7,
                                    right: AppSize.height7),
                                decoration: BoxDecoration(
                                  color: AppColor.primaryColors,
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    GestureDetector(
                                      child: const Icon(
                                        Icons.remove,
                                        size: AppSize.height14,
                                        color: AppColor.whiteColor,
                                      ),
                                      onTap: () {
                                        salonScreenController.decrement2();
                                      },
                                    ),
                                    Obx(() => Text(
                                          '${salonScreenController.value2}',
                                          style: const TextStyle(
                                              fontSize: AppSize.height14,
                                              color: AppColor.whiteColor,
                                              fontFamily: FontFamily.mulishBold,
                                              fontStyle: FontStyle.normal,
                                              fontWeight: FontWeight.w700),
                                        )),
                                    GestureDetector(
                                      child: const Icon(
                                        Icons.add,
                                        size: AppSize.height14,
                                        color: AppColor.whiteColor,
                                      ),
                                      onTap: () {
                                        salonScreenController.increment2();
                                        salonScreenController
                                            .showContainer2.value = true;
                                      },
                                    ),
                                  ],
                                ),
                              ),
                            ),
                    ))
            ],
          ),
          const SizedBox(height: AppSize.height6),
          Row(
            children: [
              Image.asset(
                AppImage.starIcon,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                height: AppSize.height12,
                width: AppSize.width12,
              ),
              const SizedBox(width: AppSize.height2),
              Text(
                AppString.reviewsRate,
                style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontSize: AppSize.height14,
                  fontWeight: FontWeight.w600,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishSemiBold,
                ),
              ),
              Container(
                width: AppSize.width6,
              ),
              Text(
                AppString.kreviews1_2,
                style: TextStyle(
                  color: Theme.of(context).textTheme.titleMedium?.color,
                  fontSize: AppSize.height14,
                  fontWeight: FontWeight.w400,
                  fontFamily: FontFamily.mulishRegular,
                  fontStyle: FontStyle.normal,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSize.height10),
          Row(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                AppString.price120,
                style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishBold,
                  fontWeight: FontWeight.w700,
                  fontSize: AppSize.height14,
                ),
              ),
              const SizedBox(width: AppSize.height4),
              Text(
                AppString.price200,
                style: TextStyle(
                  decoration: TextDecoration.lineThrough,
                  color: Theme.of(context).textTheme.titleMedium?.color,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishRegular,
                  fontWeight: FontWeight.w400,
                  fontSize: AppSize.height12,
                ),
              ),
              const Spacer(),
              Padding(
                padding: const EdgeInsets.only(right: AppSize.height14),
                child: GestureDetector(
                  onTap: () {
                    removeBottomSheet(context);
                  },
                  child: const Text(
                    AppString.remove,
                    style: TextStyle(
                      color: AppColor.primaryColorLightMode,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishRegular,
                      fontWeight: FontWeight.w400,
                      fontSize: AppSize.height14,
                    ),
                  ),
                ),
              )
            ],
          ),
        ],
      ),
    );
  }

  paymentSummary(context) {
    return Container(
      width: Get.width,
      padding: const EdgeInsets.all(AppSize.height12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSize.height12),
        border: Border.all(color: Theme.of(context).cardTheme.shadowColor!),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
              AppSize.height0,
              AppSize.height4,
            ),
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(AppString.paymentSummary,
              style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  fontSize: AppSize.height16)),
          const SizedBox(height: AppSize.height16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(AppString.price2Item,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishMedium,
                      fontWeight: FontWeight.w500,
                      fontSize: AppSize.height14)),
              Text(AppString.price2702,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height14)),
            ],
          ),
          const SizedBox(height: AppSize.height8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(AppString.discount,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishMedium,
                      fontWeight: FontWeight.w500,
                      fontSize: AppSize.height14)),
              Text(AppString.$20,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height14)),
            ],
          ),
          const SizedBox(height: AppSize.height12),
          Container(
            height: 0.5,
            color: Theme.of(context).dividerColor,
          ),
          const SizedBox(height: AppSize.height12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(AppString.totalAmount,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishMedium,
                      fontWeight: FontWeight.w500,
                      fontSize: AppSize.height14)),
              Text(AppString.price250,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height14)),
            ],
          ),
        ],
      ),
    );
  }

  continueButton() {
    return ButtonCommon(
        height: 52,
        onTap: () {
          Get.to(const SlotScreen());
        },
        width: double.infinity,
        borderColor: AppColor.primaryColorLightMode,
        buttonColor: AppColor.primaryColorLightMode,
        text: AppString.continueText,
        fontFamily: FontFamily.mulishSemiBold,
        fontWeight: FontWeight.w600,
        textColor: AppColor.whiteColor,
        fontSize: AppSize.height16);
  }

  logInSignUpButton() {
    return ButtonCommon(
        height: 52,
        onTap: () {
          Get.to(LoginScreen(
            status: "false",
          ));
        },
        width: double.infinity,
        borderColor: AppColor.primaryColorLightMode,
        buttonColor: AppColor.primaryColorLightMode,
        text: AppString.loginOrSignUp,
        fontFamily: FontFamily.mulishSemiBold,
        fontWeight: FontWeight.w600,
        textColor: AppColor.whiteColor,
        fontSize: AppSize.height16);
  }

  removeBottomSheet(BuildContext context) {
    showModalBottomSheet(
      isDismissible: false,
      isScrollControlled: true,
      shape: const OutlineInputBorder(
        borderSide: BorderSide(color: Colors.transparent),
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(12),
          topLeft: Radius.circular(12),
        ),
      ),
      backgroundColor: Colors.transparent,
      context: context,
      constraints: BoxConstraints.loose(const Size.fromHeight(278)),
      builder: (context) {
        return Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(
                  bottom: AppSize.height10, right: AppSize.height5),
              child: GestureDetector(
                onTap: () {
                  Get.back();
                },
                child: Container(
                  color: Colors.transparent,
                  alignment: Alignment.centerRight,
                  child: Image.asset(
                    AppImage.cancelBottomSheet,
                    height: AppSize.height40,
                    width: AppSize.width40,
                  ),
                ),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                color: Theme.of(context).primaryColor,
                borderRadius: const BorderRadius.only(
                  topRight: Radius.circular(12),
                  topLeft: Radius.circular(12),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Container(
                    width: AppSize.width,
                    height: AppSize.height64,
                    decoration: const BoxDecoration(
                      color: AppColor.primaryColorDarkMode,
                      borderRadius: BorderRadius.only(
                        topRight: Radius.circular(12),
                        topLeft: Radius.circular(12),
                      ),
                    ),
                    child: const Padding(
                      padding: EdgeInsets.only(
                        right: AppSize.height20,
                        left: AppSize.height20,
                        top: AppSize.height22,
                        bottom: AppSize.height22,
                      ),
                      child: Text(
                        AppString.removeFromCart,
                        style: TextStyle(
                          fontFamily: FontFamily.mulishBold,
                          fontSize: AppSize.height16,
                          fontWeight: FontWeight.w700,
                          fontStyle: FontStyle.normal,
                          color: AppColor.whiteColor,
                        ),
                      ),
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.only(
                      left: AppSize.height20,
                      right: AppSize.height20,
                      top: AppSize.height24,
                    ),
                    child: Text(
                      AppString.areYouSureRemoveThe,
                      style: TextStyle(
                        fontFamily: FontFamily.mulishMedium,
                        fontSize: AppSize.height16,
                        fontWeight: FontWeight.w500,
                        fontStyle: FontStyle.normal,
                        color:
                            Theme.of(context).appBarTheme.titleTextStyle?.color,
                      ),
                    ),
                  ),
                  const SizedBox(height: AppSize.height48),
                  Container(
                    height: AppSize.height72,
                    width: MediaQuery.of(context).size.width,
                    decoration: BoxDecoration(
                      color: Theme.of(context).appBarTheme.backgroundColor,
                      boxShadow: [
                        BoxShadow(
                          color: Theme.of(context)
                              .appBarTheme
                              .systemOverlayStyle!
                              .statusBarColor!,
                          spreadRadius: AppSize.height0,
                          blurRadius: AppSize.height18,
                          offset: const Offset(
                            AppSize.height0,
                            AppSize.height10,
                          ),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.only(
                        left: AppSize.height20, right: AppSize.height20),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: GestureDetector(
                            onTap: () {
                              Get.back();
                            },
                            child: Container(
                                alignment: Alignment.center,
                                height: AppSize.height48,
                                width: AppSize.width206,
                                decoration: BoxDecoration(
                                    color: Theme.of(context)
                                        .appBarTheme
                                        .backgroundColor,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                        width: 1,
                                        color: Theme.of(context)
                                            .colorScheme
                                            .tertiary)),
                                child: const Text(AppString.cancel,
                                    style: TextStyle(
                                        fontSize: AppSize.height16,
                                        fontStyle: FontStyle.normal,
                                        fontFamily: FontFamily.mulishSemiBold,
                                        fontWeight: FontWeight.w600,
                                        color:
                                            AppColor.primaryColorLightMode))),
                          ),
                        ),
                        const SizedBox(width: 10),
                        GestureDetector(
                          onTap: () {
                            Get.back();
                          },
                          child: Container(
                            alignment: Alignment.center,
                            height: AppSize.height48,
                            width: AppSize.width206,
                            decoration: BoxDecoration(
                              color: AppColor.primaryColors,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              AppString.remove,
                              style: TextStyle(
                                  fontSize: AppSize.height16,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishSemiBold,
                                  fontWeight: FontWeight.w600,
                                  color: AppColor.whiteColor),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }
}

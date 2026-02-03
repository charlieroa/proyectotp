import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/salon_screen_controller.dart';
import '../../custom_widget/common_divider.dart';
import '../payment/payment_screen.dart';
import '../profile_screen/manage_address_screen.dart';
import 'offers_screen.dart';

class SummaryScreen extends StatelessWidget {
  SummaryScreen({super.key});

  final SalonScreenController salonScreenController =
      Get.put(SalonScreenController());

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
                blurRadius: AppSize.height7,
                offset: const Offset(AppSize.height0, AppSize.height4),
              ),
            ],
          ),
          child: AppBar(
              scrolledUnderElevation: 0.0,
              shadowColor: Theme.of(context).appBarTheme.shadowColor,
              backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
              centerTitle: false,
              automaticallyImplyLeading: false,
              title: Row(
                children: [
                  GestureDetector(
                    onTap: () {
                      Get.back();
                    },
                    child: Image.asset(
                      AppImage.arrowLeft,
                      width: AppSize.width24,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      height: AppSize.height24,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                  Text(
                    AppString.summary,
                    style: TextStyle(
                      fontFamily: FontFamily.mulishBold,
                      fontSize: AppSize.height18,
                      fontStyle: FontStyle.normal,
                      fontWeight: FontWeight.w700,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                  ),
                ],
              )),
        ),
      ),
      body: SafeArea(
        bottom: false, // we are manually handling bottom space
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSize.height24),
              addressCard(context),
              haircutForMenCard(context),
              haircutForKidsCard(context),
              offersCard(context),
              paymentSummary(context),
            ],
          ),
        ),
      ),
      bottomNavigationBar: Obx(
        () => Visibility(
          visible: salonScreenController.value.value > 0 ||
              salonScreenController.value2.value > 0,
          child: Container(
            height: AppSize.height72,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Theme.of(context).appBarTheme.backgroundColor,
              boxShadow: [
                BoxShadow(
                  color: Theme.of(context).cardTheme.shadowColor!,
                  spreadRadius: 0,
                  blurRadius: AppSize.height18,
                  offset: const Offset(0, AppSize.height10),
                ),
              ],
            ),
            padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(AppString.price2,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height18,
                    )),
                GestureDetector(
                  onTap: () {
                    Get.to(PaymentScreen());
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
                      AppString.bookNow,
                      style: TextStyle(
                        fontSize: AppSize.height16,
                        fontFamily: FontFamily.mulishSemiBold,
                        fontWeight: FontWeight.w600,
                        color: AppColor.whiteColor,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  addressCard(context) {
    return Container(
      width: Get.width,
      padding: const EdgeInsets.all(AppSize.height12),
      margin: const EdgeInsets.only(bottom: AppSize.height18),
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(AppString.address,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height16)),
              GestureDetector(
                onTap: () {
                  Get.to(ManageAddressScreen());
                },
                child: const Text(AppString.change,
                    style: TextStyle(
                        color: AppColor.placeholderColor,
                        fontFamily: FontFamily.mulishMedium,
                        fontWeight: FontWeight.w500,
                        fontSize: AppSize.height14)),
              )
            ],
          ),
          const SizedBox(height: AppSize.height8),
          commonDivider(color: Theme.of(context).dividerColor, height: 0.5),
          const SizedBox(height: AppSize.height8),
          Text(AppString.henryCooper,
              style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  fontSize: AppSize.height14)),
          const SizedBox(height: AppSize.height4),
          Text(AppString.address1,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontFamily: FontFamily.mulishRegular,
                  fontWeight: FontWeight.w400,
                  fontSize: AppSize.height12)),
          Text(AppString.addressMobile1,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontFamily: FontFamily.mulishRegular,
                  fontWeight: FontWeight.w400,
                  fontSize: AppSize.height12)),
        ],
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
              Obx(() => salonScreenController.value.value == 0
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
                                        size: AppSize.height10,
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
                                        size: AppSize.height12,
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
                    ))
            ],
          ),
          const SizedBox(height: AppSize.height6),
          Row(
            children: [
              Image.asset(
                AppImage.starIcon,
                height: AppSize.height12,
                width: AppSize.width12,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
              ),
              const SizedBox(width: AppSize.height4),
              Row(
                children: [
                  Text(
                    AppString.reviewsRate,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontSize: AppSize.height14,
                      fontWeight: FontWeight.w600,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                    ),
                  ),
                  const SizedBox(
                    width: AppSize.width5,
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
                  )
                ],
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
      margin: const EdgeInsets.only(bottom: AppSize.height18),
      width: AppSize.width,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        color: Theme.of(context).cardColor,
        border: Border.all(
          color: Theme.of(context).cardTheme.shadowColor!,
        ),
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
                                        size: AppSize.height10,
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
                                        size: AppSize.height12,
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
              const SizedBox(width: AppSize.height4),
              Row(
                children: [
                  Text(
                    AppString.reviewsRate,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontSize: AppSize.height14,
                      fontWeight: FontWeight.w600,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                    ),
                  ),
                  const SizedBox(width: AppSize.width5),
                  Text(
                    AppString.kreviews1_2,
                    style: TextStyle(
                      color: Theme.of(context).textTheme.titleMedium?.color,
                      fontSize: AppSize.height14,
                      fontWeight: FontWeight.w600,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                    ),
                  )
                ],
              )
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

  offersCard(context) {
    return GestureDetector(
      onTap: () {
        Get.to(OffersScreen());
      },
      child: Container(
        width: Get.width,
        padding: const EdgeInsets.symmetric(
            horizontal: AppSize.height12, vertical: AppSize.height16),
        margin: const EdgeInsets.only(bottom: AppSize.height18),
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
        child: Row(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            Image.asset(AppIcons.offersIcon,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                height: AppSize.height20,
                width: AppSize.height20),
            const SizedBox(width: AppSize.height7),
            Text(
              AppString.offersPromotions,
              textAlign: TextAlign.start,
              style: TextStyle(
                  fontSize: AppSize.height16,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color),
            ),
            const Spacer(),
            const Text(
              AppString.apply,
              style: TextStyle(
                color: AppColor.primaryColorLightMode,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishRegular,
                fontWeight: FontWeight.w400,
                fontSize: AppSize.height14,
              ),
            ),
          ],
        ),
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
              Text(AppString.price2items,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishMedium,
                      fontWeight: FontWeight.w500,
                      fontSize: AppSize.height14)),
              Text(AppString.price270,
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
              Text('\$250.00',
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
      builder: (context) {
        return Column(
          mainAxisSize: MainAxisSize.min,
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
                        left: AppSize.height20,
                        right: AppSize.height20,
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
                          color:
                              AppColor.boxShadowColor.withOpacity(0.25),
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
            const SizedBox(
              height: AppSize.height6,
            )
          ],
        );
      },
    );
  }
}

import 'package:dotted_border/dotted_border.dart';
import 'package:dotted_line/dotted_line.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/my_booking_controller.dart';
import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../custom_widget/common_button.dart';
import '../../theme/themes.dart';

class HaircutForMenScreen extends StatelessWidget {
  final int index;

  HaircutForMenScreen(this.index, {super.key});

  final TextEditingController feedBackController = TextEditingController();
  final MyBookingController myBookingController =
      Get.put(MyBookingController());

  @override
  Widget build(BuildContext context) {
    feedBackController.text = AppString.absolutelyLoveThisApp;
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
                      height: AppSize.height24,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                  Text(
                    index == 1
                        ? AppString.haircutForkidsAnd1more
                        : AppString.hairCutForMane,
                    style: TextStyle(
                        fontFamily: FontFamily.mulishBold,
                        fontSize: AppSize.height18,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context)
                            .appBarTheme
                            .titleTextStyle
                            ?.color),
                  ),
                ],
              )),
        ),
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSize.height24),
              orderId(context),
              const SizedBox(height: AppSize.height18),
              haircutForMen(context),
              const SizedBox(height: AppSize.height18),
              booking(context),
              const SizedBox(height: AppSize.height18),
              address(context),
              const SizedBox(height: AppSize.height18),
              paymentSummary(context),
              const SizedBox(height: AppSize.height18),
              writeAReviewButton(context),
              const SizedBox(height: AppSize.height18),
              downloadInvoiceButton(),
              const SizedBox(height: AppSize.height10),
            ],
          ),
        ),
      ),
    );
  }

  orderId(context) {
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
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(AppString.orderId1654,
              style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  fontSize: AppSize.height16)),
          GestureDetector(
            onTap: () {
              Clipboard.setData(const ClipboardData(text: AppString.orderId1654));
              Get.snackbar("Done", 'Copied Successfully');
            },
            child: Image.asset(AppIcons.copyIcon,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                height: AppSize.height20,
                width: AppSize.height20),
          )
        ],
      ),
    );
  }

  haircutForMen(context) {
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
        children: [
          index == 1
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(AppString.hairCutForKids,
                              style: TextStyle(
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color,
                                  fontFamily: FontFamily.mulishSemiBold,
                                  fontWeight: FontWeight.w600,
                                  fontSize: AppSize.height16)),
                          const SizedBox(height: AppSize.height6),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                              Image.asset(AppImage.starIcon,
                                  height: AppSize.height12,
                                  width: AppSize.height12,
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color),
                              const SizedBox(width: AppSize.height2),
                              Text(AppString.reviewsRate,
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .appBarTheme
                                          .titleTextStyle
                                          ?.color,
                                      fontFamily: FontFamily.mulishSemiBold,
                                      fontWeight: FontWeight.w600,
                                      fontSize: AppSize.height14)),
                              const SizedBox(width: AppSize.height6),
                              Text(AppString.reviews1,
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.color,
                                      overflow: TextOverflow.ellipsis,
                                      fontFamily: FontFamily.mulishLight,
                                      fontWeight: FontWeight.w300,
                                      fontSize: AppSize.height12)),
                            ],
                          ),
                          const SizedBox(height: AppSize.height10),
                          Row(
                            children: [
                              Text(AppString.price1,
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .appBarTheme
                                          .titleTextStyle
                                          ?.color,
                                      fontFamily: FontFamily.mulishBold,
                                      fontWeight: FontWeight.w700,
                                      fontSize: AppSize.height14)),
                              Text(AppString.price200,
                                  style: TextStyle(
                                      decoration: TextDecoration.lineThrough,
                                      color: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.color,
                                      fontFamily: FontFamily.mulishRegular,
                                      fontWeight: FontWeight.w400,
                                      fontSize: AppSize.height12)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.asset(
                        AppImage.hairCutKids,
                        fit: BoxFit.fill,
                        height: AppSize.height80,
                        width: AppSize.height80,
                      ),
                    ),
                  ],
                )
              : const SizedBox(),
          index == 1
              ? const SizedBox(height: AppSize.height16)
              : const SizedBox(),
          Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(AppString.hairCutForMane,
                        style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w600,
                            fontSize: AppSize.height16)),
                    const SizedBox(height: AppSize.height6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.start,
                      children: [
                        Image.asset(AppImage.starIcon,
                            height: AppSize.height12,
                            width: AppSize.height12,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color),
                        const SizedBox(width: AppSize.height2),
                        Text(AppString.reviewsRate,
                            style: TextStyle(
                                color: Theme.of(context)
                                    .appBarTheme
                                    .titleTextStyle
                                    ?.color,
                                fontFamily: FontFamily.mulishSemiBold,
                                fontWeight: FontWeight.w600,
                                fontSize: AppSize.height14)),
                        const SizedBox(width: AppSize.height6),
                        Text(AppString.reviews1,
                            style: TextStyle(
                                color: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.color,
                                overflow: TextOverflow.ellipsis,
                                fontFamily: FontFamily.mulishLight,
                                fontWeight: FontWeight.w300,
                                fontSize: AppSize.height12)),
                      ],
                    ),
                    const SizedBox(height: AppSize.height10),
                    Row(
                      children: [
                        Text(AppString.price1,
                            style: TextStyle(
                                color: Theme.of(context)
                                    .appBarTheme
                                    .titleTextStyle
                                    ?.color,
                                fontFamily: FontFamily.mulishBold,
                                fontWeight: FontWeight.w700,
                                fontSize: AppSize.height14)),
                        Text(AppString.price200,
                            style: TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.color,
                                fontFamily: FontFamily.mulishRegular,
                                fontWeight: FontWeight.w400,
                                fontSize: AppSize.height12)),
                      ],
                    ),
                  ],
                ),
              ),
              ClipRRect(
                borderRadius: BorderRadius.circular(6),
                child: Image.asset(
                  AppImage.haircutImage,
                  fit: BoxFit.fill,
                  height: AppSize.height80,
                  width: AppSize.height80,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSize.height12),
          Container(
              height: 0.5,
              width: Get.width,
              color: Theme.of(context).dividerColor),
          const SizedBox(height: AppSize.height12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(AppString.date,
                      style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontFamily: FontFamily.mulishMedium,
                          fontWeight: FontWeight.w500,
                          fontSize: AppSize.height12)),
                  const SizedBox(height: AppSize.height4),
                  Text(AppString.date10022023,
                      style: TextStyle(
                          color: Theme.of(context).cardTheme.color,
                          fontFamily: FontFamily.mulishBold,
                          fontWeight: FontWeight.w700,
                          fontSize: AppSize.height12)),
                ],
              ),
              Column(
                mainAxisAlignment: MainAxisAlignment.start,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(AppString.time,
                      style: TextStyle(
                          color: AppColor.onBoardingTextColor,
                          fontFamily: FontFamily.mulishMedium,
                          fontWeight: FontWeight.w500,
                          fontSize: AppSize.height12)),
                  const SizedBox(height: AppSize.height4),
                  Text(AppString.time12AM,
                      style: TextStyle(
                          color: Theme.of(context).cardTheme.color,
                          fontFamily: FontFamily.mulishBold,
                          fontWeight: FontWeight.w700,
                          fontSize: AppSize.height12)),
                ],
              )
            ],
          ),
          const SizedBox(height: AppSize.height4),
        ],
      ),
    );
  }

  address(context) {
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
          Text(AppString.address,
              style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  fontSize: AppSize.height16)),
          const SizedBox(height: AppSize.height16),
          Text(AppString.addressWashington,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontFamily: FontFamily.mulishMedium,
                  fontWeight: FontWeight.w500,
                  fontSize: AppSize.height14))
        ],
      ),
    );
  }

  booking(context) {
    return Container(
      width: Get.width,
      padding: const EdgeInsets.all(AppSize.height12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSize.height12),
        border: Border.all(color: AppColor.boxShadowColor.withOpacity(0.1)),
        boxShadow: [
          BoxShadow(
            color: AppColor.boxShadowColor.withOpacity(0.1),
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
          Text(AppString.bookingStatus,
              style: TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  fontSize: AppSize.height16)),
          const SizedBox(height: AppSize.height16),
          ListView.builder(
              itemCount: 5,
              physics: const NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              itemBuilder: (BuildContext context, int index) {
                return Row(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Column(
                      mainAxisAlignment: MainAxisAlignment.start,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Image.asset(
                            index == 3 || index == 4
                                ? ((Theme.of(context)
                                        .extensions
                                        .values
                                        .firstWhere(
                                          (extension) =>
                                              extension is RegistrationStyle,
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
                                    .checkBuilder)
                                : ((Theme.of(context)
                                        .extensions
                                        .values
                                        .firstWhere(
                                          (extension) =>
                                              extension is RegistrationStyle,
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
                                    .checkDoneBuilder),
                            height: AppSize.height18,
                            width: AppSize.height18),
                        index == 4
                            ? const SizedBox()
                            : SizedBox(
                                height: 20,
                                child: DottedLine(
                                  direction: Axis.vertical,
                                  lineThickness: 1.0,
                                  dashLength: 3.0,
                                  dashColor: index == 3
                                      ? Theme.of(context)
                                          .tabBarTheme
                                          .labelColor!
                                      : Theme.of(context).colorScheme.surface,
                                  dashRadius: 0.0,
                                  dashGapLength: 3.0,
                                  dashGapRadius: 0.0,
                                ),
                              )
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.only(
                          left: AppSize.height12, right: AppSize.height12),
                      child: Text(stepperTitle[index],
                          style: TextStyle(
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                              fontFamily: FontFamily.mulishMedium,
                              fontWeight: FontWeight.w500,
                              fontSize: AppSize.height14)),
                    )
                  ],
                );
              })
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
              Text(index == 1 ? 'Price (2 items)' : AppString.price1Items,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishMedium,
                      fontWeight: FontWeight.w500,
                      fontSize: AppSize.height14)),
              Text(index == 1 ? "\$300" : AppString.$150,
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
            width: Get.width,
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
              Text(index == 1 ? '\$280' : AppString.$130,
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

  writeAReviewButton(BuildContext context) {
    return ButtonCommon(
        onTap: () {
          writeAReviewBottomSheet(context);
        },
        height: 52,
        width: double.infinity,
        borderColor: AppColor.primaryColorLightMode,
        buttonColor: Theme.of(context).primaryColor,
        text: AppString.writeAReview,
        fontFamily: FontFamily.mulishSemiBold,
        fontWeight: FontWeight.w600,
        textColor: AppColor.primaryColorLightMode,
        fontSize: AppSize.height16);
  }

  downloadInvoiceButton() {
    return const ButtonCommon(
        height: 52,
        width: double.infinity,
        borderColor: AppColor.primaryColorLightMode,
        buttonColor: AppColor.primaryColorLightMode,
        text: AppString.downloadInvoice,
        fontFamily: FontFamily.mulishSemiBold,
        fontWeight: FontWeight.w600,
        textColor: AppColor.whiteColor,
        fontSize: AppSize.height16);
  }

  writeAReviewBottomSheet(BuildContext context) {
    return showModalBottomSheet(
      useSafeArea: true,
      isDismissible: true,
      isScrollControlled: true,
      shape: const OutlineInputBorder(
        borderSide: BorderSide(color: Colors.transparent),
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(12),
          topLeft: Radius.circular(12),
        ),
      ),
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: SizedBox(
            height: AppSize.height581,
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Padding(
                padding: const EdgeInsets.only(
                    bottom: AppSize.height10,
                    right: AppSize.height5,
                    left: AppSize.height5),
                child: GestureDetector(
                  onTap: () {
                    Get.back();
                    myBookingController.selectedImagesImage.clear();
                  },
                  child: Container(
                    color: Colors.transparent,
                    child: Image.asset(
                      AppImage.cancelBottomSheet,
                      height: AppSize.height40,
                      width: AppSize.width40,
                    ),
                  ),
                ),
              ),
              Expanded(
                child: Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      borderRadius: const BorderRadius.only(
                        topRight: Radius.circular(12),
                        topLeft: Radius.circular(12),
                      ),
                    ),
                    child: SingleChildScrollView(
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
                                  AppString.hairCutForMane,
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
                            const SizedBox(height: AppSize.height24),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: AppSize.height20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    AppString.review,
                                    style: TextStyle(
                                      fontFamily: FontFamily.mulishBold,
                                      fontSize: AppSize.height18,
                                      fontWeight: FontWeight.w700,
                                      fontStyle: FontStyle.normal,
                                      color: Theme.of(context)
                                          .appBarTheme
                                          .titleTextStyle
                                          ?.color,
                                    ),
                                  ),
                                  const SizedBox(height: AppSize.height18),
                                  DottedBorder(
                                    radius: const Radius.circular(14),
                                    color: Theme.of(context)
                                        .appBarTheme
                                        .titleTextStyle!
                                        .color!,
                                    borderType: BorderType.RRect,
                                    dashPattern: const [7, 4],
                                    strokeWidth: 1,
                                    child: Container(
                                        width:
                                            MediaQuery.of(context).size.width,
                                        decoration: BoxDecoration(
                                          borderRadius:
                                              BorderRadius.circular(12),
                                          color: Theme.of(context).primaryColor,
                                        ),
                                        child: Obx(() => myBookingController
                                                .selectedImagesImage.isEmpty
                                            ? GestureDetector(
                                                onTap: () {
                                                  myBookingController
                                                      .selectImagesFromGallery3();
                                                },
                                                child: Padding(
                                                  padding: const EdgeInsets
                                                      .symmetric(vertical: 32),
                                                  child: Row(
                                                    mainAxisAlignment:
                                                        MainAxisAlignment
                                                            .center,
                                                    children: [
                                                      Image(
                                                        image: const AssetImage(
                                                            AppIcons
                                                                .cameraIcon),
                                                        color: Theme.of(context)
                                                            .appBarTheme
                                                            .titleTextStyle!
                                                            .color!,
                                                        width: AppSize.height18,
                                                        height:
                                                            AppSize.height18,
                                                      ),
                                                      const SizedBox(
                                                        width: AppSize.height6,
                                                      ),
                                                      Text(
                                                        AppString.addImages,
                                                        style: TextStyle(
                                                          fontWeight:
                                                              FontWeight.w300,
                                                          fontFamily: FontFamily
                                                              .mulishSemiBold,
                                                          fontSize:
                                                              AppSize.height14,
                                                          color: Theme.of(
                                                                  context)
                                                              .appBarTheme
                                                              .titleTextStyle!
                                                              .color!,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              )
                                            : Padding(
                                                padding: const EdgeInsets.only(
                                                    top: 10.0, bottom: 10),
                                                child: SizedBox(
                                                  height: 50,
                                                  child: ListView.builder(
                                                    scrollDirection:
                                                        Axis.horizontal,
                                                    itemCount:
                                                        myBookingController
                                                            .selectedImagesImage
                                                            .length,
                                                    itemBuilder:
                                                        (context, index) {
                                                      return Padding(
                                                        padding:
                                                            EdgeInsets.only(
                                                                right: 10.0,
                                                                left: index == 0
                                                                    ? 10
                                                                    : 0),
                                                        child: Container(
                                                          width: 50,
                                                          height: 50,
                                                          decoration: BoxDecoration(
                                                              borderRadius:
                                                                  BorderRadius
                                                                      .circular(
                                                                          5)),
                                                          child: Image.file(
                                                            myBookingController
                                                                    .selectedImagesImage[
                                                                index]!,
                                                            fit: BoxFit.fill,
                                                          ),
                                                        ),
                                                      );
                                                    },
                                                  ),
                                                ),
                                              ))),
                                  ),
                                  const SizedBox(height: AppSize.height18),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: AppSize.height15,
                                        horizontal: AppSize.height12),
                                    width: MediaQuery.of(context).size.width,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .tertiary,
                                          width: 0.5),
                                      color: Theme.of(context).primaryColor,
                                    ),
                                    child: RatingBar.builder(
                                      initialRating: 1,
                                      minRating: 1,
                                      glow: false,
                                      itemSize: 28,
                                      unratedColor: Theme.of(context)
                                          .expansionTileTheme
                                          .iconColor,
                                      direction: Axis.horizontal,
                                      allowHalfRating: true,
                                      itemCount: 5,
                                      itemPadding:
                                          const EdgeInsets.only(right: 10),
                                      itemBuilder: (context, _) => Icon(
                                        Icons.star,
                                        color: Theme.of(context)
                                            .appBarTheme
                                            .titleTextStyle
                                            ?.color,
                                      ),
                                      onRatingUpdate: (rating) {},
                                    ),
                                  ),
                                  const SizedBox(height: AppSize.height18),
                                  TextField(
                                    controller: feedBackController,
                                    maxLines: 4,
                                    style: TextStyle(
                                        color: Theme.of(context)
                                            .appBarTheme
                                            .titleTextStyle
                                            ?.color),
                                    decoration: InputDecoration(
                                      border: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(12),
                                          borderSide: BorderSide(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .tertiary,
                                              width: 0.5)),
                                      enabledBorder: OutlineInputBorder(
                                          borderRadius:
                                              BorderRadius.circular(12),
                                          borderSide: BorderSide(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .tertiary,
                                              width: 0.5)),
                                    ),
                                  )
                                ],
                              ),
                            ),
                          ]),
                    )),
              ),
              Container(
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
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSize.height20,
                ),
                child: Padding(
                  padding:
                      const EdgeInsets.symmetric(vertical: AppSize.height12),
                  child: GestureDetector(
                      onTap: () {
                        Get.back();
                      },
                      child: ButtonCommon(
                        width: Get.width,
                        height: AppSize.height48,
                        text: AppString.submit,
                        buttonColor: AppColor.primaryColorLightMode,
                      )),
                ),
              ),
            ]),
          ),
        );
      },
      context: context,
    );
  }

  final List<String> stepperTitle = [
    AppString.orderAccept,
    AppString.confirmed,
    AppString.orderAssigned,
    AppString.continueText,
    AppString.completed,
  ];
}

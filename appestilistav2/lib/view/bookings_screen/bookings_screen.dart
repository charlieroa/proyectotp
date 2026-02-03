import 'package:cupertino_will_pop_scope/cupertino_will_pop_scope.dart';
import 'package:dotted_border/dotted_border.dart';
import 'package:flutter/material.dart';
import 'package:flutter_rating_bar/flutter_rating_bar.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/language_controller.dart';
import 'package:home_helper_flutter_ui_kit/custom_widget/common_button.dart';
import 'package:home_helper_flutter_ui_kit/view/bookings_screen/haircut_for_men_screen.dart';
import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/my_booking_controller.dart';
import '../../custom_widget/custom_textfield.dart';
import '../../theme/themes.dart';

class BookingsScreen extends StatelessWidget {
  final int? index;

  BookingsScreen({super.key, this.index});

  final MyBookingController myBookingController =
      Get.put(MyBookingController());
  final LanguageController languageController = Get.put(LanguageController());

  final TextEditingController feedBackController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    languageController.loadSelectedLanguage();
    feedBackController.text = AppString.absolutelyLoveThisApp;
    return SafeArea(
      child: ConditionalWillPopScope(
        onWillPop: () async {
          myBookingController.selectedImagesImage.clear();

          return true;
        },
        shouldAddCallback: false,
        child: Scaffold(
            resizeToAvoidBottomInset: false,
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
                  scrolledUnderElevation: 0.0,
                  shadowColor: Theme.of(context).appBarTheme.shadowColor,
                  backgroundColor:
                      Theme.of(context).appBarTheme.backgroundColor,
                  centerTitle: false,
                  automaticallyImplyLeading: false,
                  title: Row(
                    children: [
                      index == 1
                          ? Row(
                              children: [
                                GestureDetector(
                                  onTap: () {
                                    Get.back();
                                  },
                                  child: Image.asset(
                                    AppImage.arrowLeft,
                                    width: AppSize.width24,
                                    height: AppSize.height24,
                                    color: Theme.of(context)
                                        .appBarTheme
                                        .titleTextStyle
                                        ?.color,
                                  ),
                                ),
                                const SizedBox(width: AppSize.height8),
                              ],
                            )
                          : const SizedBox(),
                      Text(
                        AppString.myBookings,
                        style: TextStyle(
                          fontFamily: FontFamily.mulishBold,
                          fontSize: AppSize.height18,
                          fontStyle: FontStyle.normal,
                          fontWeight: FontWeight.w700,
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            body: SingleChildScrollView(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: AppSize.height20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.start,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: AppSize.height20),
                    searchService(context),
                    const SizedBox(height: AppSize.height20),
                    myBookingList(),
                  ],
                ),
              ),
            )),
      ),
    );
  }

  Widget searchService(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: CustomTextField(
            controller: TextEditingController(),
            hintText: AppString.searchHear,
            contentPadding: const EdgeInsets.only(
              left: AppSize.width20,
              right: AppSize.width20,
              top: AppSize.height17,
              bottom: AppSize.height17,
            ),
            fontFamily: FontFamily.mulishRegular,
            fontSize: AppSize.height14,
            fontStyle: FontStyle.normal,
            fontWeight: FontWeight.w400,
            color: AppColor.placeholderDarkMode,
            prefixIcon: Image.asset(
              AppIcons.searchIcon,
              width: AppSize.width20,
              color: Theme.of(context).appBarTheme.titleTextStyle?.color,
            ),
          ),
        ),
        const SizedBox(width: AppSize.width12),
        GestureDetector(
          onTap: () {
            filterBottomSheet(context);
          },
          child: Container(
            width: AppSize.width54,
            height: AppSize.height52,
            padding: const EdgeInsets.all(AppSize.height16),
            decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                color: AppColor.primaryColors),
            child: Image.asset(
              AppIcons.filterIcon,
            ),
          ),
        ),
      ],
    );
  }

  Widget myBookingList() {
    return Obx(
      () => ListView.builder(
          itemCount: myBookingController.myBookingList.length,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemBuilder: (BuildContext context, int index) {
            var mData = myBookingController.myBookingList[index];
            return GestureDetector(
              onTap: () {
                index == 1
                    ? Get.to(HaircutForMenScreen(1))
                    : Get.to(HaircutForMenScreen(0));
              },
              child: Container(
                width: Get.width,
                padding: const EdgeInsets.all(AppSize.height12),
                margin: const EdgeInsets.only(bottom: AppSize.height18),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(AppSize.height12),
                  border:
                      Border.all(color: Theme.of(context).cardTheme.shadowColor!),
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
                    ClipRRect(
                      borderRadius: BorderRadius.circular(6),
                      child: Image.asset(
                        mData.image!,
                        fit: BoxFit.fill,
                        height: AppSize.height80,
                        width: AppSize.height80,
                      ),
                    ),
                    const SizedBox(width: AppSize.height14),
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(mData.title!,
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
                              Text("4.5",
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .appBarTheme
                                          .titleTextStyle
                                          ?.color,
                                      fontFamily: FontFamily.mulishSemiBold,
                                      fontWeight: FontWeight.w600,
                                      fontSize: AppSize.height14)),
                              const SizedBox(width: AppSize.height6),
                              Text("(1.2k reviews)",
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.color,
                                      overflow: TextOverflow.ellipsis,
                                      fontFamily: FontFamily.mulishLight,
                                      fontWeight: FontWeight.w400,
                                      fontSize: AppSize.height12)),
                              Expanded(
                                child: Padding(
                                    padding: const EdgeInsets.only(
                                        top: AppSize.height8,
                                        right: AppSize.height8),
                                    child: Obx(
                                      () => Align(
                                        alignment: languageController.arb.value
                                            ? Alignment.centerLeft
                                            : Alignment.centerRight,
                                        child: Image.asset(
                                          AppIcons.arrowRightIcon,
                                          height: AppSize.height17,
                                          width: AppSize.height17,
                                          color: Theme.of(context)
                                              .appBarTheme
                                              .titleTextStyle
                                              ?.color,
                                        ),
                                      ),
                                    )),
                              )
                            ],
                          ),
                          const SizedBox(height: AppSize.height16),
                          GestureDetector(
                            onTap: () {
                              writeAReviewBottomSheet(context);
                            },
                            child: const Text("Write a review",
                                style: TextStyle(
                                    color: AppColor.primaryColorLightMode,
                                    fontFamily: FontFamily.mulishMedium,
                                    fontWeight: FontWeight.w600,
                                    fontSize: AppSize.height12)),
                          ),
                        ],
                      ),
                    )
                  ],
                ),
              ),
            );
          }),
    );
  }

  filterBottomSheet(BuildContext context) {
    return showModalBottomSheet(
      isDismissible: true,
      enableDrag: true,
      shape: const OutlineInputBorder(
        borderSide: BorderSide(color: Colors.transparent),
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(12),
          topLeft: Radius.circular(12),
        ),
      ),
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Padding(
                padding: const EdgeInsets.only(
                    bottom: AppSize.height10,
                    right: AppSize.height5,
                    left: AppSize.height5),
                child: GestureDetector(
                  onTap: () {
                    Get.back();
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
                            mainAxisSize: MainAxisSize.min,
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
                                    AppString.filter,
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
                                      AppString.bookingStatus,
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
                                    ListView.builder(
                                        itemCount: myBookingController
                                            .bookingStatusList1.length,
                                        shrinkWrap: true,
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        itemBuilder:
                                            (BuildContext context, int index) {
                                          var mData = myBookingController
                                              .bookingStatusList1[index];
                                          return Padding(
                                            padding: const EdgeInsets.only(
                                                bottom: AppSize.height12),
                                            child: GestureDetector(
                                              onTap: () {
                                                mData.isSelected?.value =
                                                    !mData.isSelected!.value;
                                              },
                                              child: Container(
                                                width: double.infinity,
                                                color: Colors.transparent,
                                                child: Row(children: [
                                                  Obx(
                                                    () => Image.asset(
                                                        mData.isSelected!.value
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
                                                                              radioBuilder2: "",
                                                                              radioBuilder: "",
                                                                              frameBuilder: '',
                                                                              checkBuilder: '',
                                                                              checkDoneBuilder: ''),
                                                                        )
                                                                    as RegistrationStyle)
                                                                .bannerBuilder)
                                                            : ((Theme.of(
                                                                        context)
                                                                    .extensions
                                                                    .values
                                                                    .firstWhere(
                                                                      (extension) =>
                                                                          extension
                                                                              is RegistrationStyle,
                                                                      orElse: () => const RegistrationStyle(
                                                                          iconBuilder:
                                                                              "",
                                                                          logoBuilder:
                                                                              "",
                                                                          bannerBuilder:
                                                                              "",
                                                                          imageBuilder:
                                                                              "",
                                                                          radioBuilder2:
                                                                              "",
                                                                          radioBuilder:
                                                                              "",
                                                                          frameBuilder:
                                                                              '',
                                                                          checkBuilder:
                                                                              '',
                                                                          checkDoneBuilder:
                                                                              ''),
                                                                    ) as RegistrationStyle)
                                                                .logoBuilder),
                                                        height: AppSize.height18,
                                                        width: AppSize.height18),
                                                  ),
                                                  const SizedBox(
                                                      width: AppSize.width8),
                                                  Text(
                                                    mData.title ?? '',
                                                    style: TextStyle(
                                                        fontFamily: FontFamily
                                                            .mulishMedium,
                                                        color: Theme.of(context)
                                                            .appBarTheme
                                                            .titleTextStyle
                                                            ?.color,
                                                        fontSize:
                                                            AppSize.height14,
                                                        fontWeight:
                                                            FontWeight.w500,
                                                        fontStyle:
                                                            FontStyle.normal),
                                                  ),
                                                ]),
                                              ),
                                            ),
                                          );
                                        }),
                                    Text(
                                      AppString.bookingStatus,
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
                                    ListView.builder(
                                        itemCount: myBookingController
                                            .bookingStatusList2.length,
                                        shrinkWrap: true,
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        itemBuilder:
                                            (BuildContext context, int index) {
                                          var mData = myBookingController
                                              .bookingStatusList2[index];
                                          return Padding(
                                            padding: const EdgeInsets.only(
                                                bottom: AppSize.height12),
                                            child: GestureDetector(
                                              onTap: () {
                                                mData.isSelected?.value =
                                                    !mData.isSelected!.value;
                                              },
                                              child: Container(
                                                width: double.infinity,
                                                color: Colors.transparent,
                                                child: Row(children: [
                                                  Obx(
                                                    () => Image.asset(
                                                        mData.isSelected!.value
                                                            ? ((Theme.of(context)
                                                                        .extensions
                                                                        .values
                                                                        .firstWhere(
                                                                          (extension) =>
                                                                              extension
                                                                                  is RegistrationStyle,
                                                                          orElse: () => const RegistrationStyle(
                                                                              iconBuilder:
                                                                                  "",
                                                                              logoBuilder:
                                                                                  "",
                                                                              bannerBuilder:
                                                                                  "",
                                                                              imageBuilder:
                                                                                  "",
                                                                              radioBuilder2:
                                                                                  "",
                                                                              radioBuilder:
                                                                                  "",
                                                                              frameBuilder:
                                                                                  '',
                                                                              checkBuilder:
                                                                                  '',
                                                                              checkDoneBuilder:
                                                                                  ''),
                                                                        )
                                                                    as RegistrationStyle)
                                                                .bannerBuilder)
                                                            : ((Theme.of(context)
                                                                    .extensions
                                                                    .values
                                                                    .firstWhere(
                                                                      (extension) =>
                                                                          extension
                                                                              is RegistrationStyle,
                                                                      orElse: () => const RegistrationStyle(
                                                                          iconBuilder:
                                                                              "",
                                                                          logoBuilder:
                                                                              "",
                                                                          bannerBuilder:
                                                                              "",
                                                                          imageBuilder:
                                                                              "",
                                                                          radioBuilder2:
                                                                              "",
                                                                          radioBuilder:
                                                                              "",
                                                                          frameBuilder:
                                                                              '',
                                                                          checkBuilder:
                                                                              '',
                                                                          checkDoneBuilder:
                                                                              ''),
                                                                    ) as RegistrationStyle)
                                                                .logoBuilder),
                                                        height: AppSize.height18,
                                                        width: AppSize.height18),
                                                  ),
                                                  const SizedBox(
                                                      width: AppSize.width8),
                                                  Text(
                                                    mData.title ?? '',
                                                    style: TextStyle(
                                                        fontFamily: FontFamily
                                                            .mulishMedium,
                                                        color: Theme.of(context)
                                                            .appBarTheme
                                                            .titleTextStyle
                                                            ?.color,
                                                        fontSize:
                                                            AppSize.height14,
                                                        fontWeight:
                                                            FontWeight.w500,
                                                        fontStyle:
                                                            FontStyle.normal),
                                                  ),
                                                ]),
                                              ),
                                            ),
                                          );
                                        }),
                                  ],
                                ),
                              ),
                            ]),
                      ))),
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
                    GestureDetector(
                      onTap: () {
                        Get.back();
                      },
                      child: Container(
                        alignment: Alignment.center,
                        height: AppSize.height48,
                        width: AppSize.height130,
                        decoration: BoxDecoration(
                            color:
                                Theme.of(context).appBarTheme.backgroundColor,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: Theme.of(context).colorScheme.tertiary,
                                width: 1)),
                        child: const Text(
                          AppString.reset,
                          style: TextStyle(
                              fontSize: AppSize.height16,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishSemiBold,
                              fontWeight: FontWeight.w600,
                              color: AppColor.primaryColorDarkMode),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSize.height14),
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
                            color: AppColor.primaryColors,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            AppString.apply,
                            style: TextStyle(
                                fontSize: AppSize.height16,
                                fontStyle: FontStyle.normal,
                                fontFamily: FontFamily.mulishSemiBold,
                                fontWeight: FontWeight.w600,
                                color: AppColor.whiteColor),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ]);
      },
      context: context,
    );
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
                    bottom: AppSize.height10, right: AppSize.height5),
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
}

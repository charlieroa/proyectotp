import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/language_controller.dart';
import 'package:home_helper_flutter_ui_kit/controller/my_booking_controller.dart';
import 'package:home_helper_flutter_ui_kit/controller/salon_screen_controller.dart';
import 'package:home_helper_flutter_ui_kit/controller/view_detail_controller.dart';
import 'package:stepper_list_view/stepper_list_view.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../custom_widget/custom_progressbar.dart';
import '../../theme/themes.dart';
import '../bottom_screen/bottom_screen.dart';

class ViewDetailScreen extends StatelessWidget {
  ViewDetailScreen({Key? key}) : super(key: key);
  final ViewDetailController viewDetailController =
      Get.put(ViewDetailController());
  final ScrollController scrollController = ScrollController();
  final SalonScreenController salonScreenController =
      Get.put(SalonScreenController());
  final MyBookingController myBookingController =
      Get.put(MyBookingController());
  final LanguageController languageController = Get.put(LanguageController());

  @override
  Widget build(BuildContext context) {
    languageController.loadSelectedLanguage();
    scrollController.addListener(
      () {
        if (scrollController.offset > 0) {
          viewDetailController.updateShowShadow(true);
        } else {
          viewDetailController.updateShowShadow(false);
        }
      },
    );
    return Scaffold(
      resizeToAvoidBottomInset: true,
      backgroundColor: Theme.of(context).primaryColor,
      appBar: PreferredSize(
          preferredSize: const Size.fromHeight(kToolbarHeight),
          child: Container(
            decoration: BoxDecoration(
              boxShadow: [
                BoxShadow(
                  color: viewDetailController.showShadow.value
                      ? Theme.of(context).appBarTheme.shadowColor!
                      : Colors.transparent,
                  spreadRadius: AppSize.height0,
                  blurRadius: AppSize.height7,
                  offset: const Offset(
                    AppSize.height0,
                    AppSize.height4,
                  ),
                ),
              ],
            ),
            child: Obx(
              () => AppBar(
                scrolledUnderElevation: 0.0,
                shadowColor: viewDetailController.showShadow.value
                    ? Theme.of(context).appBarTheme.shadowColor
                    : Colors.transparent,
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
                      AppString.hairCut,
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
                ),
              ),
            ),
          )),
      body: Obx(() {
        viewDetailController.values.value = viewDetailController.value.value;
        return Stack(
          children: [
            SingleChildScrollView(
              controller: scrollController,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(
                      left: AppSize.height20,
                      right: AppSize.height20,
                      top: AppSize.height24,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        hairCutForMan(context),
                        const SizedBox(height: AppSize.height40),
                        aboutTheProcess(context),
                        const SizedBox(height: AppSize.height22),
                        stepperData(context),
                        const SizedBox(height: AppSize.height22),
                        afterCareGuideDataText(context),
                        const SizedBox(height: AppSize.height22),
                        afterCareGuideDataTextData(context),
                        const SizedBox(height: AppSize.height22),
                        reviewText(context),
                        const SizedBox(height: AppSize.height22),
                        showReview(context),
                      ],
                    ),
                  ),
                  const SizedBox(height: AppSize.height40),
                  reviewSData(),
                  SizedBox(
                      height: viewDetailController.value.value > 0 &&
                              viewDetailController.showContainer.value == true
                          ? AppSize.height70
                          : 0),
                ],
              ),
            ),
            Obx(
              () => Visibility(
                visible: viewDetailController.value.value > 0 &&
                    viewDetailController.showContainer.value == true,
                child: Positioned(
                  bottom: AppSize.height0,
                  left: AppSize.height0,
                  right: AppSize.height0,
                  child: Container(
                    height: AppSize.height72,
                    width: MediaQuery.of(context).size.width,
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      boxShadow: [
                        BoxShadow(
                          color: Theme.of(context).appBarTheme.shadowColor!,
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
                      left: AppSize.height20,
                      right: AppSize.height20,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        RichText(
                          text: TextSpan(
                            text: AppString.price350,
                            style: TextStyle(
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishBold,
                              fontWeight: FontWeight.w700,
                              fontSize: AppSize.height18,
                            ),
                            children: [
                              TextSpan(
                                text: AppString.price350,
                                style: TextStyle(
                                  decoration: TextDecoration.lineThrough,
                                  color: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.color,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishRegular,
                                  fontWeight: FontWeight.w400,
                                  fontSize: AppSize.height14,
                                ),
                              ),
                            ],
                          ),
                        ),
                        GestureDetector(
                          onTap: () {
                            Get.to(const BottomScreen(initialIndex: 2));
                            salonScreenController.toggleContent();
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
                              AppString.viewCart,
                              style: TextStyle(
                                fontSize: AppSize.height16,
                                fontStyle: FontStyle.normal,
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
            ),
          ],
        );
      }),
    );
  }

  Widget hairCutForMan(context) {
    return Column(
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
            Obx(() => viewDetailController.value.value == 0
                ? Obx(
                    () => GestureDetector(
                      onTap: () {
                        viewDetailController.toggleVisibility();
                        viewDetailController.showContainer.value = true;
                        viewDetailController.value.value == 0
                            ? viewDetailController.value.value = 1
                            : viewDetailController.value.value =
                                viewDetailController.value.value;
                      },
                      child: Visibility(
                        visible: viewDetailController.value.value == 0
                            ? true
                            : !viewDetailController.showContainer.value,
                        child: Container(
                          alignment: Alignment.center,
                          height: AppSize.height32,
                          width: AppSize.width80,
                          decoration: BoxDecoration(
                            color: Theme.of(context).primaryColor,
                            border: Border.all(
                                color: Theme.of(context).colorScheme.tertiary),
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
                    () => viewDetailController.value.value <= 0 ||
                            viewDetailController.showContainer.value == false
                        ? GestureDetector(
                            onTap: () {
                              viewDetailController.toggleVisibility();
                              viewDetailController.value.value = 1;
                            },
                            child: Visibility(
                              visible: true,
                              child: Container(
                                alignment: Alignment.center,
                                height: AppSize.height32,
                                width: AppSize.width80,
                                decoration: BoxDecoration(
                                  color: Theme.of(context).primaryColor,
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
                            visible: viewDetailController.showContainer.value,
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
                                      viewDetailController.decrement();
                                    },
                                  ),
                                  Obx(() => Text(
                                        '${viewDetailController.value}',
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
                                      viewDetailController.increment();
                                      viewDetailController.showContainer.value =
                                          true;
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
            const SizedBox(width: AppSize.height3),
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
            const SizedBox(width: AppSize.height6),
            Text(
              AppString.reviews1,
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
        RichText(
          text: TextSpan(
            text: AppString.price1,
            style: TextStyle(
              color: Theme.of(context).appBarTheme.titleTextStyle?.color,
              fontStyle: FontStyle.normal,
              fontFamily: FontFamily.mulishBold,
              fontWeight: FontWeight.w700,
              fontSize: AppSize.height14,
            ),
            children: [
              TextSpan(
                text: AppString.price200,
                style: TextStyle(
                  decoration: TextDecoration.lineThrough,
                  color: Theme.of(context).textTheme.titleMedium?.color,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishRegular,
                  fontWeight: FontWeight.w400,
                  fontSize: AppSize.height12,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget aboutTheProcess(context) {
    return Text(
      AppString.aboutTheProcess,
      textAlign: TextAlign.start,
      style: TextStyle(
        fontSize: AppSize.height18,
        fontStyle: FontStyle.normal,
        fontFamily: FontFamily.mulishBold,
        fontWeight: FontWeight.w700,
        color: Theme.of(context).appBarTheme.titleTextStyle?.color,
      ),
    );
  }

  final List<String> l = [
    AppString.consultation,
    AppString.setUp,
    AppString.partingSectioning,
    AppString.hairCut,
    AppString.confirmation,
    AppString.cleanUp,
  ];
  final List<String> stepperDescription = [
    AppString.professionalUnderstands,
    AppString.sanitizationOFTools,
    AppString.detanglingOfHair,
    AppString.sprayingOfWater,
    AppString.recheckingOfThe,
    AppString.removalOfAll,
  ];

  List<StepperItemData> generateStepperData() {
    return List.generate(
      6,
      (index) {
        return StepperItemData(
          id: '${index + 1}',
          content: {
            'name': l[index % l.length],
            'occupation': stepperDescription[index % stepperDescription.length],
          },
        );
      },
    ).toList();
  }

  Widget stepperData(context) {
    final stepperData = generateStepperData();

    return StepperListView(
      stepperData: stepperData,
      stepperThemeData:
          StepperThemeData(lineColor: Theme.of(context).dividerColor),
      physics: const NeverScrollableScrollPhysics(),
      showStepperInLast: false,
      shrinkWrap: true,
      stepAvatar: (_, data) {
        final stepData = data as StepperItemData;
        return PreferredSize(
          preferredSize: const Size.fromRadius(15),
          child: CircleAvatar(
            maxRadius: 15,
            backgroundColor: AppColor.onBoardingNext,
            child: Text(
              "${stepData.id}",
              style: const TextStyle(
                fontSize: AppSize.height14,
                color: AppColor.secondaryColor,
                fontWeight: FontWeight.w400,
                fontFamily: FontFamily.mulishRegular,
              ),
            ),
          ),
        );
      },
      stepContentWidget: (_, data) {
        final stepData = data as StepperItemData;
        return Obx(() => Padding(
              padding: EdgeInsets.only(
                  right: languageController.arb.value ? 10 : 0,
                  left: languageController.arb.value ? 0 : 10),
              child: ListTile(
                contentPadding: const EdgeInsets.only(top: 0),
                title: Text(
                  "${stepData.content['name']}",
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontWeight: FontWeight.w600,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontSize: AppSize.height16),
                ),
                subtitle: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 10),
                    Column(
                      children: [
                        Text(
                          "${stepData.content['occupation'] ?? ''}",
                          style: TextStyle(
                              color: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.color,
                              fontWeight: FontWeight.w400,
                              fontFamily: FontFamily.mulishRegular,
                              fontSize: AppSize.height14),
                        ),
                      ],
                    ),
                    const SizedBox(height: 7),
                  ],
                ),
              ),
            ));
      },
    );
  }

  Widget afterCareGuideDataText(context) {
    return Text(
      AppString.afterCareGuide,
      style: TextStyle(
          fontSize: AppSize.height18,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget afterCareGuideDataTextData(context) {
    return Text(
      AppString.afterGettingYour,
      style: TextStyle(
          fontSize: AppSize.height14,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishRegular,
          fontWeight: FontWeight.w400,
          color: Theme.of(context).textTheme.titleMedium?.color),
    );
  }

  Widget reviewText(context) {
    return Row(
      children: [
        Text(
          AppString.reviewsViewDetail,
          style: TextStyle(
              fontSize: AppSize.height18,
              fontStyle: FontStyle.normal,
              fontFamily: FontFamily.mulishBold,
              fontWeight: FontWeight.w700,
              color: Theme.of(context).appBarTheme.titleTextStyle?.color),
        ),
        const Spacer(),
        GestureDetector(
          onTap: () {
            filterBottomSheet(context);
          },
          child: const Text(
            AppString.filter,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishSemiBold,
                fontWeight: FontWeight.w600,
                color: AppColor.placeholderColor),
          ),
        ),
      ],
    );
  }

  Widget showReview(context) {
    return Column(
      children: [
        CustomProgressBar(
          text: AppString.five,
          width: Get.width / 1.5,
          value: 86,
          totalValue: 100,
          reviewsDetail: AppString.k668,
        ),
        CustomProgressBar(
          text: AppString.four,
          width: Get.width / 1.5,
          value: 20,
          totalValue: 100,
          reviewsDetail: AppString.k23,
        ),
        CustomProgressBar(
          text: AppString.three,
          width: Get.width / 1.5,
          value: 10,
          totalValue: 100,
          reviewsDetail: AppString.k8,
        ),
        CustomProgressBar(
          text: AppString.two,
          width: Get.width / 1.5,
          value: 5,
          totalValue: 100,
          reviewsDetail: AppString.k4,
        ),
        CustomProgressBar(
          text: AppString.one,
          width: Get.width / 1.5,
          value: 5,
          totalValue: 100,
          reviewsDetail: AppString.k3,
        ),
      ],
    );
  }

  Widget reviewSData() {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      shrinkWrap: true,
      itemCount: viewDetailController.viewDetailReviews.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 18),
          child: Column(
            children: [
              ListTile(
                leading: CircleAvatar(
                  backgroundImage: AssetImage(
                      viewDetailController.viewDetailReviewsImage[index]),
                ),
                title: Text(
                  viewDetailController.viewDetailReviewTitle[index],
                  style: TextStyle(
                    fontFamily: FontFamily.mulishSemiBold,
                    fontSize: AppSize.height16,
                    fontStyle: FontStyle.normal,
                    fontWeight: FontWeight.w600,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  ),
                ),
                subtitle: Text(
                  viewDetailController.viewDetailReviewTime[index],
                  style: TextStyle(
                    fontFamily: FontFamily.mulishMedium,
                    fontSize: AppSize.height14,
                    fontStyle: FontStyle.normal,
                    fontWeight: FontWeight.w500,
                    color: Theme.of(context).textTheme.titleMedium?.color,
                  ),
                ),
                trailing: SizedBox(
                  width: 26,
                  child: Row(
                    children: [
                      Image.asset(AppImage.starIcon,
                          height: AppSize.height12,
                          width: AppSize.width12,
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color),
                      const SizedBox(width: 4),
                      Text(
                        viewDetailController.viewDetailReviews[index],
                        style: TextStyle(
                          fontFamily: FontFamily.mulishSemiBold,
                          fontSize: AppSize.height14,
                          fontStyle: FontStyle.normal,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                        ),
                      )
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 15.0),
                child: Text(
                  viewDetailController.viewDetailReviewDescription[index],
                  style: TextStyle(
                    fontFamily: FontFamily.mulishRegular,
                    fontSize: AppSize.height14,
                    fontStyle: FontStyle.normal,
                    fontWeight: FontWeight.w400,
                    color: Theme.of(context).textTheme.titleMedium?.color,
                  ),
                ),
              ),
            ],
          ),
        );
      },
      separatorBuilder: (context, index) {
        return Divider(
          color: Theme.of(context).dividerColor,
          thickness: 0.5,
        );
      },
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
                              const SizedBox(height: AppSize.height22),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: AppSize.height20),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      AppString.rating,
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
                                    const SizedBox(height: AppSize.height30),
                                    ListView.builder(
                                        itemCount: myBookingController
                                            .reviewList.length,
                                        shrinkWrap: true,
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        itemBuilder:
                                            (BuildContext context, int index) {
                                          var mData = myBookingController
                                              .reviewList[index];
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
                                                                              radioBuilder: '',
                                                                              radioBuilder2: '',
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
                                                                          radioBuilder:
                                                                              '',
                                                                          radioBuilder2:
                                                                              '',
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
                                                  const SizedBox(
                                                      width: AppSize.width8),
                                                  Image.asset(
                                                    AppImage.starIcon,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    height: AppSize.height12,
                                                    width: AppSize.width12,
                                                  ),
                                                ]),
                                              ),
                                            ),
                                          );
                                        }),
                                    const SizedBox(height: AppSize.height10),
                                    Text(
                                      AppString.shortBy,
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
                                    const SizedBox(
                                      height: AppSize.height12,
                                    ),
                                    GestureDetector(
                                      onTap: () {
                                        salonScreenController.recentTap.value =
                                            true;
                                        salonScreenController
                                            .mostDetailTap.value = false;
                                      },
                                      child: Row(
                                        children: [
                                          Obx(
                                            () => Container(
                                              height: AppSize.height20,
                                              width: AppSize.width20,
                                              padding: const EdgeInsets.all(
                                                  AppSize.height2),
                                              decoration: BoxDecoration(
                                                  borderRadius:
                                                      BorderRadius.circular(30),
                                                  border: Border.all(
                                                    color: salonScreenController
                                                                .recentTap
                                                                .value ==
                                                            true
                                                        ? Theme.of(context)
                                                            .appBarTheme
                                                            .titleTextStyle!
                                                            .color!
                                                        : Theme.of(context)
                                                            .disabledColor,
                                                  )),
                                              child: Container(
                                                width: AppSize.width14,
                                                height: AppSize.height14,
                                                decoration: BoxDecoration(
                                                    color: salonScreenController
                                                                .recentTap
                                                                .value ==
                                                            true
                                                        ? Theme.of(context)
                                                            .appBarTheme
                                                            .titleTextStyle
                                                            ?.color
                                                        : Theme.of(context)
                                                            .appBarTheme
                                                            .backgroundColor,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            30)),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: AppSize.width8),
                                          Text(
                                            AppString.recent,
                                            style: TextStyle(
                                                fontFamily:
                                                    FontFamily.mulishMedium,
                                                color: Theme.of(context)
                                                    .appBarTheme
                                                    .titleTextStyle
                                                    ?.color,
                                                fontSize: AppSize.height14,
                                                fontWeight: FontWeight.w500,
                                                fontStyle: FontStyle.normal),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: AppSize.height10),
                                    GestureDetector(
                                      onTap: () {
                                        salonScreenController.recentTap.value =
                                            false;
                                        salonScreenController
                                            .mostDetailTap.value = true;
                                      },
                                      child: Row(
                                        children: [
                                          Obx(
                                            () => Container(
                                              height: AppSize.height20,
                                              width: AppSize.width20,
                                              padding: const EdgeInsets.all(
                                                  AppSize.height2),
                                              decoration: BoxDecoration(
                                                  borderRadius:
                                                      BorderRadius.circular(30),
                                                  border: Border.all(
                                                      color: salonScreenController
                                                                  .mostDetailTap
                                                                  .value ==
                                                              true
                                                          ? Theme.of(context)
                                                              .appBarTheme
                                                              .titleTextStyle!
                                                              .color!
                                                          : Theme.of(context)
                                                              .disabledColor)),
                                              child: Container(
                                                width: AppSize.width14,
                                                height: AppSize.height14,
                                                decoration: BoxDecoration(
                                                    color: salonScreenController
                                                                .mostDetailTap
                                                                .value ==
                                                            true
                                                        ? Theme.of(context)
                                                            .appBarTheme
                                                            .titleTextStyle
                                                            ?.color
                                                        : Theme.of(context)
                                                            .appBarTheme
                                                            .backgroundColor,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            30)),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: AppSize.width8),
                                          Text(
                                            AppString.mostDetailed,
                                            style: TextStyle(
                                                fontFamily:
                                                    FontFamily.mulishMedium,
                                                color: Theme.of(context)
                                                    .appBarTheme
                                                    .titleTextStyle
                                                    ?.color,
                                                fontSize: AppSize.height14,
                                                fontWeight: FontWeight.w500,
                                                fontStyle: FontStyle.normal),
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(
                                      height: AppSize.height10,
                                    )
                                  ],
                                ),
                              ),
                            ]),
                      ))),
              Container(
                height: AppSize.height72,
                width: MediaQuery.of(context).size.width,
                decoration: BoxDecoration(
                  color: Theme.of(context).primaryColor,
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
                            color: Theme.of(context).primaryColor,
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
}

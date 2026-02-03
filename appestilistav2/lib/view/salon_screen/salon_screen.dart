import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/controller/language_controller.dart';
import 'package:home_helper_flutter_ui_kit/controller/salon_screen_controller.dart';
import 'package:home_helper_flutter_ui_kit/view/my_cart_screen/my_cart_screen.dart';
import '../../config/app_icons.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/home_controller.dart';
import '../../model/salon_screen_modal.dart';
import '../bottom_screen/bottom_screen.dart';

class SalonScreen extends StatelessWidget {
  SalonScreen({Key? key}) : super(key: key);
  final SalonScreenController salonScreenController =
      Get.put(SalonScreenController());
  final ScrollController scrollController = ScrollController();
  final HomeController homeController = Get.put(HomeController());
  final LanguageController languageController = Get.put(LanguageController());
  final controller = PageController();
  final int minValue = 0;
  final int maxValue = 0;

  @override
  Widget build(BuildContext context) {
    languageController.loadSelectedLanguage();
    scrollController.addListener(() {
      if (scrollController.offset > 0) {
        salonScreenController.updateShowShadow(true);
      } else {
        salonScreenController.updateShowShadow(false);
      }
    });
    salonScreenController.scrollController.addListener(() {
      salonScreenController.isScrolled.value =
          salonScreenController.scrollController.offset > 0;
    });

    return SafeArea(
      child: Scaffold(
        backgroundColor: Theme.of(context).primaryColor,
        body: Obx(() {
          salonScreenController.values.value =
              salonScreenController.value.value;
          return GetBuilder<SalonScreenController>(
            builder: (salonScreenController) {
              return Stack(
                children: [
                  SingleChildScrollView(
                    child: Stack(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            buildPagerView(),
                            const SizedBox(
                              height: 20,
                            ),
                            Padding(
                              padding: const EdgeInsets.only(
                                  left: AppSize.height20,
                                  right: AppSize.height20),
                              child: salonForKidsManText(context),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: reviewsData(context),
                            ),
                            const SizedBox(height: AppSize.height12),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: ourSalonCatersText(context),
                            ),
                            const SizedBox(height: AppSize.height24),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: categoriesList(),
                            ),
                            const SizedBox(height: AppSize.height40),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: packagesText(context),
                            ),
                            const SizedBox(height: AppSize.height22),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: packageData(context),
                            ),
                            const SizedBox(height: AppSize.height25),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: haircutText(context),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: haircutDetail(),
                            ),
                            const SizedBox(height: AppSize.height22),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: faceCareText(context),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: faceCareDetail(),
                            ),
                            const SizedBox(height: AppSize.height22),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: shaveText(context),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: cleanShaveDetail(),
                            ),
                            const SizedBox(height: AppSize.height40),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: beardGroomingText(context),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: beardGroomingDetail(),
                            ),
                            const SizedBox(height: AppSize.height40),
                            Padding(
                              padding: const EdgeInsets.only(
                                left: AppSize.height20,
                                right: AppSize.height20,
                              ),
                              child: massageText(context),
                            ),
                            Obx(
                              () => Padding(
                                padding: EdgeInsets.only(
                                    left: AppSize.height20,
                                    right: AppSize.height20,
                                    bottom: salonScreenController.value.value >
                                                0 ||
                                            salonScreenController.value2.value >
                                                0
                                        ? AppSize.height70
                                        : 0),
                                child: massageDetail(),
                              ),
                            )
                          ],
                        ),
                        Positioned(
                          top: 200,
                          left: 20,
                          child: Obx(
                            () => Row(
                              mainAxisAlignment: MainAxisAlignment.start,
                              children: List.generate(
                                salonSliderList.length,
                                (int index) => buildDot(index: index),
                              ),
                            ),
                          ),
                        ),
                        Positioned(
                          top: 14,
                          left: 20,
                          child: GestureDetector(
                            onTap: () {
                              Get.back();
                              FocusManager.instance.primaryFocus?.unfocus();
                            },
                            child: Container(
                              width: AppSize.width32,
                              height: AppSize.height32,
                              padding: const EdgeInsets.all(AppSize.height6),
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: AppColor.whiteColor,
                              ),
                              child: Image.asset(
                                AppImage.arrowLeft,
                                fit: BoxFit.contain,
                                width: AppSize.width20,
                                height: AppSize.height20,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Obx(
                    () => Visibility(
                      visible: salonScreenController.value.value > 0 ||
                          salonScreenController.value2.value > 0,
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
                                color:
                                    Theme.of(context).appBarTheme.shadowColor!,
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
                                  Get.to(const BottomScreen(
                                    initialIndex: 2,
                                  ));
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
            },
          );
        }),
        floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
        floatingActionButtonAnimator: FloatingActionButtonAnimator.scaling,
        floatingActionButton: Stack(
          alignment: Alignment.center,
          children: [
            Container(),
            Obx(() {
              return Positioned(
                bottom: salonScreenController.value.value > 0 ||
                        salonScreenController.value2.value > 0
                    ? AppSize.height85
                    : AppSize.height20,
                child: homeController.isMenuButtonVisible.value
                    ? SizedBox(
                        height: AppSize.height40,
                        width: AppSize.width88,
                        child: FloatingActionButton.extended(
                          autofocus: false,
                          extendedIconLabelSpacing: 4,
                          extendedPadding: const EdgeInsets.only(
                              left: AppSize.height14, right: AppSize.height14),
                          backgroundColor:
                              salonScreenController.isButtonHighlighted.value
                                  ? Theme.of(context).colorScheme.surface
                                  : Theme.of(context).colorScheme.surface,
                          icon: Image.asset(
                            AppIcons.menuIcon,
                            width: AppSize.width20,
                            height: AppSize.height20,
                          ),
                          label: const Text(
                            AppString.menu,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: AppSize.height14,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishSemiBold,
                              fontWeight: FontWeight.w600,
                              color: AppColor.whiteColor,
                            ),
                          ),
                          onPressed: () {
                            salonScreenController.isButtonHighlighted.value =
                                !salonScreenController
                                    .isButtonHighlighted.value;
                            homeController.isMenuButtonVisible.value = false;
                            showDialog(
                              barrierColor: Colors.black.withOpacity(0.80),
                              useSafeArea: false,
                              context: context,
                              builder: (context) {
                                return Padding(
                                  padding: EdgeInsets.only(
                                    top: salonScreenController.value.value >
                                                0 ||
                                            salonScreenController.value2.value >
                                                0
                                        ? MediaQuery.sizeOf(context).height / 2
                                        : MediaQuery.sizeOf(context).height /
                                            1.7,
                                  ),
                                  child: Column(
                                    children: [
                                      Dialog(
                                        backgroundColor:
                                            Theme.of(context).primaryColor,
                                        elevation: AppSize.height10,
                                        alignment: Alignment.bottomCenter,
                                        insetPadding: const EdgeInsets.all(14),
                                        clipBehavior: Clip.none,
                                        shape: const RoundedRectangleBorder(
                                          borderRadius: BorderRadius.all(
                                            Radius.circular(12),
                                          ),
                                        ),
                                        child: Obx(
                                          () => GridView.builder(
                                            physics:
                                                const NeverScrollableScrollPhysics(),
                                            shrinkWrap: true,
                                            padding: const EdgeInsets.all(14),
                                            itemCount: salonScreenController
                                                .colorList.length,
                                            gridDelegate:
                                                const SliverGridDelegateWithFixedCrossAxisCount(
                                              crossAxisCount: 3,
                                              crossAxisSpacing:
                                                  AppSize.height10,
                                              mainAxisSpacing: AppSize.height10,
                                            ),
                                            itemBuilder: (context, index) {
                                              return GestureDetector(
                                                onTap: () {
                                                  var comparestr =
                                                      AppString.hairCut;
                                                  if (salonScreenController
                                                          .nameList[index] ==
                                                      comparestr) {
                                                    Get.back();
                                                  }
                                                },
                                                child: Container(
                                                  padding:
                                                      const EdgeInsets.only(
                                                    top: AppSize.height12,
                                                    left: AppSize.height12,
                                                    right: AppSize.height12,
                                                  ),
                                                  height: AppSize.height102,
                                                  width: AppSize.width102,
                                                  decoration: BoxDecoration(
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            6),
                                                    color: salonScreenController
                                                        .colorList[index],
                                                  ),
                                                  child: Column(
                                                    mainAxisAlignment:
                                                        MainAxisAlignment
                                                            .center,
                                                    children: [
                                                      Image.asset(
                                                          salonScreenController
                                                              .imageList[index],
                                                          height:
                                                              AppSize.height32,
                                                          width:
                                                              AppSize.width32),
                                                      const SizedBox(
                                                          height:
                                                              AppSize.height14),
                                                      Text(
                                                        salonScreenController
                                                            .nameList[index],
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                        maxLines: 1,
                                                        textAlign:
                                                            TextAlign.center,
                                                        style: const TextStyle(
                                                          fontFamily: FontFamily
                                                              .mulishSemiBold,
                                                          fontStyle:
                                                              FontStyle.normal,
                                                          fontWeight:
                                                              FontWeight.w600,
                                                          color: AppColor
                                                              .secondaryColor,
                                                          fontSize:
                                                              AppSize.height14,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                        ),
                                      ),
                                      SizedBox(
                                        height: AppSize.height40,
                                        width: AppSize.width88,
                                        child: FloatingActionButton.extended(
                                          extendedPadding:
                                              const EdgeInsets.only(
                                            left: AppSize.height14,
                                            right: AppSize.height14,
                                          ),
                                          onPressed: () {
                                            Get.back();
                                          },
                                          extendedIconLabelSpacing: 4,
                                          autofocus: false,
                                          backgroundColor: salonScreenController
                                                  .isButtonHighlighted.value
                                              ? Theme.of(context)
                                                  .colorScheme
                                                  .surface
                                              : Theme.of(context)
                                                  .colorScheme
                                                  .surface,
                                          icon: Image.asset(
                                            AppIcons.cancelDialogIcon,
                                            width: AppSize.width20,
                                            height: AppSize.height20,
                                          ),
                                          label: const Text(
                                            AppString.close,
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                              fontSize: AppSize.height14,
                                              fontStyle: FontStyle.normal,
                                              fontFamily:
                                                  FontFamily.mulishSemiBold,
                                              fontWeight: FontWeight.w600,
                                              color: AppColor.whiteColor,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ).then((value) {
                              homeController.isMenuButtonVisible.value = true;
                            });
                          },
                        ),
                      )
                    : Container(),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget buildPagerView() {
    return SizedBox(
      height: AppSize.height214,
      child: PageView.builder(
        clipBehavior: Clip.none,
        controller: controller,
        allowImplicitScrolling: true,
        onPageChanged: (value) {
          salonScreenController.pageViewIndex.value = value;
        },
        itemCount: salonSliderList.length,
        scrollDirection: Axis.horizontal,
        itemBuilder: (BuildContext context, int index) {
          return Stack(
            children: [
              Container(
                  height: AppSize.height214,
                  width: Get.width,
                  decoration: BoxDecoration(
                      image: DecorationImage(
                          image: AssetImage(
                            salonSliderList[index].image ?? "",
                          ),
                          fit: BoxFit.fill)),
                  child: Center(
                    child: Image.asset(
                      AppImage.playVideo,
                      height: AppSize.height48,
                      width: AppSize.width48,
                    ),
                  )),
            ],
          );
        },
      ),
    );
  }

  Widget buildDot({required int index}) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      margin: const EdgeInsets.only(right: AppSize.height3),
      height: AppSize.height2,
      width: AppSize.height224,
      decoration: BoxDecoration(
        color: salonScreenController.pageViewIndex.value == index
            ? AppColor.primaryColors
            : AppColor.whiteColor,
        borderRadius: BorderRadius.circular(AppSize.height11),
      ),
    );
  }

  Widget salonForKidsManText(context) {
    return Text(
      AppString.salonForKidsMan,
      textAlign: TextAlign.center,
      style: TextStyle(
          fontSize: 18,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget salonForKidsManText1() {
    return const Padding(
      padding: EdgeInsets.only(right: 40),
      child: Text(
        AppString.salonForKidsMan,
        textAlign: TextAlign.center,
        style: TextStyle(
          fontSize: 20,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: AppColor.secondaryColor,
        ),
      ),
    );
  }

  Widget reviewsData(context) {
    return Row(
      children: [
        Image.asset(
          AppImage.starIcon,
          width: AppSize.height12,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color,
        ),
        const SizedBox(width: AppSize.width3),
        Row(
          children: [
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
            const SizedBox(
              width: AppSize.width6,
            ),
            Text(
              AppString.reviews1,
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
    );
  }

  Widget ourSalonCatersText(context) {
    return Text(
      AppString.ourSalonCatersToBoth,
      textAlign: TextAlign.start,
      style: TextStyle(
          fontSize: AppSize.height14,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishRegular,
          fontWeight: FontWeight.w400,
          color: Theme.of(context).textTheme.titleMedium?.color),
    );
  }

  Widget categoriesList() {
    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      padding: EdgeInsets.zero,
      shrinkWrap: true,
      itemCount: salonScreenController.colorList.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: AppSize.height22,
          mainAxisSpacing: AppSize.height20),
      itemBuilder: (context, index) {
        return Container(
          padding: const EdgeInsets.only(
              top: AppSize.height10, bottom: AppSize.height10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: salonScreenController.colorList[index],
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Image.asset(salonScreenController.imageList[index],
                  height: AppSize.height32, width: AppSize.width32),
              SizedBox(
                  height: index == 0 || index == 1 || index == 2 || index == 4
                      ? 14
                      : 6),
              Flexible(
                child: Text(
                  salonScreenController.nameList[index],
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontFamily: FontFamily.mulishSemiBold,
                    fontStyle: FontStyle.normal,
                    fontWeight: FontWeight.w600,
                    color: AppColor.secondaryColor,
                    fontSize: AppSize.height14,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget packagesText(context) {
    return Text(
      AppString.packages,
      textAlign: TextAlign.center,
      style: TextStyle(
          fontSize: AppSize.height18,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget packageData(BuildContext context) {
    return Column(
      children: [
        Container(
          margin: const EdgeInsets.only(
              bottom: AppSize.height18, top: AppSize.height0),
          width: AppSize.width,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Theme.of(context).cardColor,
            border: Border.all(color: AppColor.boxShadowColor.withOpacity(0.1)),
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
          child: Padding(
            padding: const EdgeInsets.only(
              left: AppSize.height12,
              right: AppSize.height12,
              top: AppSize.height12,
              bottom: AppSize.height12,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Image.asset(
                      AppImage.offSalon,
                      height: AppSize.height16,
                      width: AppSize.width16,
                    ),
                    const Text(
                      AppString.off10,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: AppSize.height12,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishSemiBold,
                          fontWeight: FontWeight.w600,
                          color: AppColor.greenColor),
                    ),
                  ],
                ),
                const SizedBox(height: AppSize.height8),
                Row(
                  children: [
                    SizedBox(
                      width: Get.width * 0.5,
                      child: Text(
                        AppString.hairCutPlusBeard,
                        maxLines: 2,
                        textAlign: TextAlign.start,
                        style: TextStyle(
                            fontSize: AppSize.height16,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color),
                      ),
                    ),
                    const Spacer(),
                    salonScreenController.value.value == 0
                        ? Obx(
                            () => GestureDetector(
                              onTap: () {
                                salonScreenController.toggleVisibility();
                                salonScreenController.showContainer.value =
                                    true;
                                salonScreenController.value.value == 0
                                    ? salonScreenController.value.value = 1
                                    : salonScreenController.value.value =
                                        salonScreenController.value.value;
                              },
                              child: Visibility(
                                visible: salonScreenController.value.value == 0
                                    ? true
                                    : !salonScreenController
                                        .showContainer.value,
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
                            ),
                          )
                        : Obx(
                            () => salonScreenController.value.value <= 0 ||
                                    salonScreenController.showContainer.value ==
                                        false
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
                                          borderRadius:
                                              BorderRadius.circular(6),
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
                                    visible: salonScreenController
                                        .showContainer.value,
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
                                                    fontFamily:
                                                        FontFamily.mulishBold,
                                                    fontStyle: FontStyle.normal,
                                                    fontWeight:
                                                        FontWeight.w700),
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
                          )
                  ],
                ),
                const SizedBox(height: AppSize.height6),
                Row(
                  children: [
                    Image.asset(
                      AppImage.starIcon,
                      height: AppSize.height12,
                      width: AppSize.width12,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                    const SizedBox(width: AppSize.height2),
                    Row(
                      children: [
                        Text(
                          AppString.reviewsRate,
                          style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontSize: AppSize.height14,
                            fontWeight: FontWeight.w600,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                          ),
                        ),
                        const SizedBox(
                          width: AppSize.width6,
                        ),
                        Text(
                          AppString.reviews1,
                          style: TextStyle(
                            color:
                                Theme.of(context).textTheme.titleMedium?.color,
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
                RichText(
                  text: TextSpan(
                    text: AppString.price2,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height14,
                    ),
                    children: [
                      TextSpan(
                        text: AppString.price400,
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
                const SizedBox(height: AppSize.height14),
                Divider(color: Theme.of(context).dividerColor),
                const SizedBox(height: AppSize.height14),
                RichText(
                  text: TextSpan(
                    text: AppString.hairCutPackageText,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height12,
                    ),
                    children: [
                      TextSpan(
                        text: AppString.hairCutManPackageText,
                        style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishMedium,
                          fontWeight: FontWeight.w500,
                          fontSize: AppSize.height12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSize.height3),
                RichText(
                  text: TextSpan(
                    text: AppString.beardGroomingPackageText,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height12,
                    ),
                    children: [
                      TextSpan(
                        text: AppString.beardGroomingStyling,
                        style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishMedium,
                          fontWeight: FontWeight.w500,
                          fontSize: AppSize.height12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSize.height3),
                RichText(
                  text: TextSpan(
                    text: AppString.massagePackageText,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height12,
                    ),
                    children: [
                      TextSpan(
                        text: AppString.relaxingMassage,
                        style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishMedium,
                          fontWeight: FontWeight.w500,
                          fontSize: AppSize.height12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSize.height6),
                GestureDetector(
                  onTap: () {
                    showModalBottomSheet(
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
                      isScrollControlled: true,
                      constraints: const BoxConstraints.expand(
                        height: AppSize.height700,
                      ),
                      builder: (context) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(
                                  bottom: AppSize.height10,
                                  right: AppSize.height5),
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
                                height: 704,
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
                                          AppString.hairCutBeardGroomingMassage,
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
                                    const SizedBox(height: AppSize.height18),
                                    Padding(
                                      padding: const EdgeInsets.only(
                                        left: AppSize.height20,
                                        right: AppSize.height20,
                                        top: AppSize.height20,
                                      ),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            AppString.hairCut,
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
                                              height: AppSize.height18),
                                          Row(
                                            children: [
                                              Obx(
                                                () => GestureDetector(
                                                  onTap: () {
                                                    salonScreenController
                                                        .isHaircutTap
                                                        .value = true;
                                                    salonScreenController
                                                        .isIDonNeed
                                                        .value = false;
                                                  },
                                                  child: Container(
                                                    height: AppSize.height20,
                                                    width: AppSize.width20,
                                                    padding:
                                                        const EdgeInsets.all(
                                                            AppSize.height2),
                                                    decoration: BoxDecoration(
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                                30),
                                                        border: Border.all(
                                                            color: salonScreenController
                                                                        .isHaircutTap
                                                                        .value ==
                                                                    true
                                                                ? Theme.of(
                                                                        context)
                                                                    .appBarTheme
                                                                    .titleTextStyle!
                                                                    .color!
                                                                : Theme.of(
                                                                        context)
                                                                    .disabledColor)),
                                                    child: Container(
                                                      width: AppSize.width14,
                                                      height: AppSize.height14,
                                                      decoration: BoxDecoration(
                                                          color: salonScreenController
                                                                      .isHaircutTap
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle
                                                                  ?.color
                                                              : Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .backgroundColor,
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      30)),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: AppSize.width8),
                                              Text(
                                                AppString.hairCutForMane,
                                                style: TextStyle(
                                                    fontFamily:
                                                        FontFamily.mulishMedium,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w500,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                              const Spacer(),
                                              Text(
                                                AppString.price199,
                                                style: TextStyle(
                                                    fontFamily: FontFamily
                                                        .mulishRegular,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w400,
                                                    color: Theme.of(context)
                                                        .textTheme
                                                        .titleMedium
                                                        ?.color,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(
                                              height: AppSize.height12),
                                          Row(
                                            children: [
                                              Obx(
                                                () => GestureDetector(
                                                  onTap: () {
                                                    salonScreenController
                                                        .isHaircutTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isIDonNeed
                                                        .value = true;
                                                  },
                                                  child: Container(
                                                    height: AppSize.height20,
                                                    width: AppSize.width20,
                                                    padding:
                                                        const EdgeInsets.all(
                                                            AppSize.height2),
                                                    decoration: BoxDecoration(
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                                30),
                                                        border: Border.all(
                                                            color: salonScreenController
                                                                        .isIDonNeed
                                                                        .value ==
                                                                    true
                                                                ? Theme.of(
                                                                        context)
                                                                    .appBarTheme
                                                                    .titleTextStyle!
                                                                    .color!
                                                                : Theme.of(
                                                                        context)
                                                                    .disabledColor)),
                                                    child: Container(
                                                      width: AppSize.width14,
                                                      height: AppSize.height14,
                                                      decoration: BoxDecoration(
                                                          color: salonScreenController
                                                                      .isIDonNeed
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle
                                                                  ?.color
                                                              : Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .backgroundColor,
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      30)),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: AppSize.width8),
                                              Text(
                                                AppString.iDonNeedHairCut,
                                                style: TextStyle(
                                                    fontFamily:
                                                        FontFamily.mulishMedium,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w500,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(
                                              height: AppSize.height40),
                                          Text(
                                            AppString.beardGroomingText,
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
                                              height: AppSize.height18),
                                          Row(
                                            children: [
                                              Obx(
                                                () => GestureDetector(
                                                  onTap: () {
                                                    salonScreenController
                                                        .isBeardGroomingTap
                                                        .value = true;
                                                    salonScreenController
                                                        .isIDonNeedBeardGrooming
                                                        .value = false;
                                                  },
                                                  child: Container(
                                                    height: AppSize.height20,
                                                    width: AppSize.width20,
                                                    padding:
                                                        const EdgeInsets.all(
                                                            AppSize.height2),
                                                    decoration: BoxDecoration(
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                                30),
                                                        border: Border.all(
                                                            color: salonScreenController
                                                                        .isBeardGroomingTap
                                                                        .value ==
                                                                    true
                                                                ? Theme.of(
                                                                        context)
                                                                    .appBarTheme
                                                                    .titleTextStyle!
                                                                    .color!
                                                                : Theme.of(
                                                                        context)
                                                                    .disabledColor)),
                                                    child: Container(
                                                      width: AppSize.width14,
                                                      height: AppSize.height14,
                                                      decoration: BoxDecoration(
                                                          color: salonScreenController
                                                                      .isBeardGroomingTap
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle
                                                                  ?.color
                                                              : Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .backgroundColor,
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      30)),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: AppSize.width8),
                                              Text(
                                                AppString.beardTrimming,
                                                style: TextStyle(
                                                    fontFamily:
                                                        FontFamily.mulishMedium,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w500,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                              const Spacer(),
                                              Text(
                                                AppString.price120,
                                                style: TextStyle(
                                                    fontFamily: FontFamily
                                                        .mulishRegular,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w400,
                                                    color: Theme.of(context)
                                                        .textTheme
                                                        .titleMedium
                                                        ?.color,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(
                                              height: AppSize.height12),
                                          Row(
                                            children: [
                                              Obx(
                                                () => GestureDetector(
                                                  onTap: () {
                                                    salonScreenController
                                                        .isBeardGroomingTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isIDonNeedBeardGrooming
                                                        .value = true;
                                                  },
                                                  child: Container(
                                                    height: AppSize.height20,
                                                    width: AppSize.width20,
                                                    padding:
                                                        const EdgeInsets.all(
                                                            AppSize.height2),
                                                    decoration: BoxDecoration(
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(30),
                                                        border: Border.all(
                                                          color: salonScreenController
                                                                      .isIDonNeedBeardGrooming
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle!
                                                                  .color!
                                                              : Theme.of(
                                                                      context)
                                                                  .disabledColor,
                                                        )),
                                                    child: Container(
                                                      width: AppSize.width14,
                                                      height: AppSize.height14,
                                                      decoration: BoxDecoration(
                                                          color: salonScreenController
                                                                      .isIDonNeedBeardGrooming
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle
                                                                  ?.color
                                                              : Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .backgroundColor,
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      30)),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: AppSize.width8),
                                              Text(
                                                AppString.iDonNeedBeardGrooming,
                                                style: TextStyle(
                                                    fontFamily:
                                                        FontFamily.mulishMedium,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w500,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(
                                              height: AppSize.height30),
                                          Text(
                                            AppString.massage,
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
                                              height: AppSize.height18),
                                          Row(
                                            children: [
                                              Obx(
                                                () => GestureDetector(
                                                  onTap: () {
                                                    salonScreenController
                                                        .isRegularMassageTap
                                                        .value = true;
                                                    salonScreenController
                                                        .isRelaxMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isHeadMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isDonNeedMassage
                                                        .value = false;
                                                  },
                                                  child: Container(
                                                    height: AppSize.height20,
                                                    width: AppSize.width20,
                                                    padding:
                                                        const EdgeInsets.all(
                                                            AppSize.height2),
                                                    decoration: BoxDecoration(
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(30),
                                                        border: Border.all(
                                                          color: salonScreenController
                                                                      .isRegularMassageTap
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle!
                                                                  .color!
                                                              : Theme.of(
                                                                      context)
                                                                  .disabledColor,
                                                        )),
                                                    child: Container(
                                                      width: AppSize.width14,
                                                      height: AppSize.height14,
                                                      decoration: BoxDecoration(
                                                          color: salonScreenController
                                                                      .isRegularMassageTap
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle
                                                                  ?.color
                                                              : Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .backgroundColor,
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      30)),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: AppSize.width8),
                                              Text(
                                                AppString.regularMassage,
                                                style: TextStyle(
                                                    fontFamily:
                                                        FontFamily.mulishMedium,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w500,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                              const Spacer(),
                                              Text(
                                                AppString.price120,
                                                style: TextStyle(
                                                    fontFamily: FontFamily
                                                        .mulishRegular,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w400,
                                                    color: Theme.of(context)
                                                        .textTheme
                                                        .titleMedium
                                                        ?.color,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(
                                              height: AppSize.height12),
                                          Row(
                                            children: [
                                              Obx(
                                                () => GestureDetector(
                                                  onTap: () {
                                                    salonScreenController
                                                        .isRegularMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isRelaxMassageTap
                                                        .value = true;
                                                    salonScreenController
                                                        .isHeadMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isDonNeedMassage
                                                        .value = false;
                                                  },
                                                  child: Container(
                                                    height: AppSize.height20,
                                                    width: AppSize.width20,
                                                    padding:
                                                        const EdgeInsets.all(
                                                            AppSize.height2),
                                                    decoration: BoxDecoration(
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(30),
                                                        border: Border.all(
                                                          color: salonScreenController
                                                                      .isRelaxMassageTap
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle!
                                                                  .color!
                                                              : Theme.of(
                                                                      context)
                                                                  .disabledColor,
                                                        )),
                                                    child: Container(
                                                      width: AppSize.width14,
                                                      height: AppSize.height14,
                                                      decoration: BoxDecoration(
                                                          color: salonScreenController
                                                                      .isRelaxMassageTap
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle
                                                                  ?.color
                                                              : Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .backgroundColor,
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      30)),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: AppSize.width8),
                                              Text(
                                                AppString.relaxMassage,
                                                style: TextStyle(
                                                    fontFamily:
                                                        FontFamily.mulishMedium,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w500,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                              const Spacer(),
                                              Text(
                                                AppString.price130,
                                                style: TextStyle(
                                                    fontFamily: FontFamily
                                                        .mulishRegular,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w400,
                                                    color: Theme.of(context)
                                                        .textTheme
                                                        .titleMedium
                                                        ?.color,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(
                                              height: AppSize.height12),
                                          Row(
                                            children: [
                                              Obx(
                                                () => GestureDetector(
                                                  onTap: () {
                                                    salonScreenController
                                                        .isRegularMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isRelaxMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isHeadMassageTap
                                                        .value = true;
                                                    salonScreenController
                                                        .isDonNeedMassage
                                                        .value = false;
                                                  },
                                                  child: Container(
                                                    height: AppSize.height20,
                                                    width: AppSize.width20,
                                                    padding:
                                                        const EdgeInsets.all(
                                                            AppSize.height2),
                                                    decoration: BoxDecoration(
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(30),
                                                        border: Border.all(
                                                          color: salonScreenController
                                                                      .isHeadMassageTap
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle!
                                                                  .color!
                                                              : Theme.of(
                                                                      context)
                                                                  .disabledColor,
                                                        )),
                                                    child: Container(
                                                      width: AppSize.width14,
                                                      height: AppSize.height14,
                                                      decoration: BoxDecoration(
                                                          color: salonScreenController
                                                                      .isHeadMassageTap
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle
                                                                  ?.color
                                                              : Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .backgroundColor,
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      30)),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: AppSize.width8),
                                              Text(
                                                AppString.headMassageText,
                                                style: TextStyle(
                                                    fontFamily:
                                                        FontFamily.mulishMedium,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w500,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                              const Spacer(),
                                              Text(
                                                AppString.price150,
                                                style: TextStyle(
                                                    fontFamily: FontFamily
                                                        .mulishRegular,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w400,
                                                    color: Theme.of(context)
                                                        .textTheme
                                                        .titleMedium
                                                        ?.color,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(
                                              height: AppSize.height12),
                                          Row(
                                            children: [
                                              Obx(
                                                () => GestureDetector(
                                                  onTap: () {
                                                    salonScreenController
                                                        .isRegularMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isRelaxMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isHeadMassageTap
                                                        .value = false;
                                                    salonScreenController
                                                        .isDonNeedMassage
                                                        .value = true;
                                                  },
                                                  child: Container(
                                                    height: AppSize.height20,
                                                    width: AppSize.width20,
                                                    padding:
                                                        const EdgeInsets.all(
                                                            AppSize.height2),
                                                    decoration: BoxDecoration(
                                                        borderRadius:
                                                            BorderRadius
                                                                .circular(30),
                                                        border: Border.all(
                                                          color: salonScreenController
                                                                      .isDonNeedMassage
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle!
                                                                  .color!
                                                              : Theme.of(
                                                                      context)
                                                                  .disabledColor,
                                                        )),
                                                    child: Container(
                                                      width: AppSize.width14,
                                                      height: AppSize.height14,
                                                      decoration: BoxDecoration(
                                                          color: salonScreenController
                                                                      .isDonNeedMassage
                                                                      .value ==
                                                                  true
                                                              ? Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .titleTextStyle
                                                                  ?.color
                                                              : Theme.of(
                                                                      context)
                                                                  .appBarTheme
                                                                  .backgroundColor,
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      30)),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(
                                                  width: AppSize.width8),
                                              Text(
                                                AppString.iDonNeedMassage,
                                                style: TextStyle(
                                                    fontFamily:
                                                        FontFamily.mulishMedium,
                                                    color: Theme.of(context)
                                                        .appBarTheme
                                                        .titleTextStyle
                                                        ?.color,
                                                    fontSize: AppSize.height14,
                                                    fontWeight: FontWeight.w500,
                                                    fontStyle:
                                                        FontStyle.normal),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(
                                              height: AppSize.height48),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      height: AppSize.height72,
                                      width: MediaQuery.of(context).size.width,
                                      decoration: BoxDecoration(
                                        color: Theme.of(context).primaryColor,
                                        boxShadow: [
                                          BoxShadow(
                                            color: AppColor.boxShadowColor
                                                .withOpacity(0.25),
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
                                          right: AppSize.height20),
                                      child: Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
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
                                                fontFamily:
                                                    FontFamily.mulishBold,
                                                fontWeight: FontWeight.w700,
                                                fontSize: AppSize.height18,
                                              ),
                                              children: [
                                                TextSpan(
                                                  text: AppString.price350,
                                                  style: TextStyle(
                                                    decoration: TextDecoration
                                                        .lineThrough,
                                                    color: Theme.of(context)
                                                        .textTheme
                                                        .titleMedium
                                                        ?.color,
                                                    fontStyle: FontStyle.normal,
                                                    fontFamily: FontFamily
                                                        .mulishRegular,
                                                    fontWeight: FontWeight.w400,
                                                    fontSize: AppSize.height14,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          GestureDetector(
                                            onTap: () {
                                              Get.to(MyCartScreen());
                                              salonScreenController
                                                  .toggleContent();
                                            },
                                            child: Container(
                                              alignment: Alignment.center,
                                              height: AppSize.height48,
                                              width: AppSize.width206,
                                              decoration: BoxDecoration(
                                                color: AppColor.primaryColors,
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                              ),
                                              child: const Text(
                                                AppString.viewCart,
                                                style: TextStyle(
                                                    fontSize: AppSize.height16,
                                                    fontStyle: FontStyle.normal,
                                                    fontFamily: FontFamily
                                                        .mulishSemiBold,
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
                            ),
                          ],
                        );
                      },
                      context: context,
                    );
                  },
                  child: const Text(
                    AppString.editYourPackage,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        fontSize: AppSize.height12,
                        fontStyle: FontStyle.normal,
                        fontFamily: FontFamily.mulishBold,
                        fontWeight: FontWeight.w700,
                        color: AppColor.primaryColors),
                  ),
                ),
              ],
            ),
          ),
        ),
        Container(
          margin: const EdgeInsets.only(
              bottom: AppSize.height18, top: AppSize.height0),
          width: AppSize.width,
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
          child: Padding(
            padding: const EdgeInsets.only(
              left: AppSize.height12,
              right: AppSize.height12,
              top: AppSize.height12,
              bottom: AppSize.height12,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Image.asset(
                      AppImage.offSalon,
                      height: AppSize.height16,
                      width: AppSize.width16,
                    ),
                    const Text(
                      AppString.off50,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: AppSize.height12,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishSemiBold,
                          fontWeight: FontWeight.w600,
                          color: AppColor.greenColor),
                    ),
                  ],
                ),
                const SizedBox(height: AppSize.height8),
                Row(
                  children: [
                    SizedBox(
                      width: Get.width * 0.5,
                      child: Text(
                        AppString.pedicurePlusBeard,
                        maxLines: 2,
                        textAlign: TextAlign.start,
                        style: TextStyle(
                            fontSize: AppSize.height16,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color),
                      ),
                    ),
                    const Spacer(),
                    Obx(() => salonScreenController.value2.value == 0
                        ? Obx(
                            () => GestureDetector(
                              onTap: () {
                                salonScreenController.showContainer2.value =
                                    true;
                                salonScreenController.value2.value == 0
                                    ? salonScreenController.value2.value = 1
                                    : salonScreenController.value2.value =
                                        salonScreenController.value2.value;
                              },
                              child: Visibility(
                                visible: salonScreenController.value2.value == 0
                                    ? true
                                    : !salonScreenController
                                        .showContainer2.value,
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
                            ),
                          )
                        : Obx(
                            () => salonScreenController.value2.value <= 0 ||
                                    salonScreenController
                                            .showContainer2.value ==
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
                                          borderRadius:
                                              BorderRadius.circular(6),
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
                                              salonScreenController
                                                  .decrement2();
                                            },
                                          ),
                                          Obx(() => Text(
                                                '${salonScreenController.value2}',
                                                style: const TextStyle(
                                                    fontSize: AppSize.height14,
                                                    color: AppColor.whiteColor,
                                                    fontFamily:
                                                        FontFamily.mulishBold,
                                                    fontStyle: FontStyle.normal,
                                                    fontWeight:
                                                        FontWeight.w700),
                                              )),
                                          GestureDetector(
                                            child: const Icon(
                                              Icons.add,
                                              size: AppSize.height12,
                                              color: AppColor.whiteColor,
                                            ),
                                            onTap: () {
                                              salonScreenController
                                                  .increment2();
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
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      height: AppSize.height12,
                      width: AppSize.width12,
                    ),
                    const SizedBox(width: AppSize.height2),
                    RichText(
                      text: TextSpan(
                        text: AppString.reviewsRateSalon,
                        style: TextStyle(
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                          fontSize: AppSize.height14,
                          fontWeight: FontWeight.w600,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishSemiBold,
                        ),
                        children: [
                          TextSpan(
                            text: AppString.reviewsSalon,
                            style: TextStyle(
                              color: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w400,
                              fontFamily: FontFamily.mulishRegular,
                              fontStyle: FontStyle.normal,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSize.height10),
                RichText(
                  text: TextSpan(
                    text: AppString.price350,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height14,
                    ),
                    children: [
                      TextSpan(
                        text: AppString.price400,
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
                const SizedBox(height: AppSize.height14),
                Divider(color: Theme.of(context).dividerColor),
                const SizedBox(height: AppSize.height14),
                RichText(
                  text: TextSpan(
                    text: AppString.hairCutPackageText,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height12,
                    ),
                    children: [
                      TextSpan(
                        text: AppString.hairCutManPackageText,
                        style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishMedium,
                          fontWeight: FontWeight.w500,
                          fontSize: AppSize.height12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSize.height3),
                RichText(
                  text: TextSpan(
                    text: AppString.manicureText,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height12,
                    ),
                    children: [
                      TextSpan(
                        text: AppString.manicureSalon,
                        style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishMedium,
                          fontWeight: FontWeight.w500,
                          fontSize: AppSize.height12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSize.height3),
                RichText(
                  text: TextSpan(
                    text: AppString.pedicure,
                    style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height12,
                    ),
                    children: [
                      TextSpan(
                        text: AppString.pedicureDetail,
                        style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishMedium,
                          fontWeight: FontWeight.w500,
                          fontSize: AppSize.height12,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSize.height6),
                const Text(
                  AppString.editYourPackage,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: AppSize.height12,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      color: AppColor.primaryColors),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget haircutText(context) {
    return Text(
      AppString.hairCut,
      textAlign: TextAlign.center,
      style: TextStyle(
          fontSize: AppSize.height18,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget haircutDetail() {
    return ListView.builder(
      shrinkWrap: true,
      controller: scrollController,
      padding: const EdgeInsets.only(top: AppSize.height22),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: salonScreenController.offerList.length,
      itemBuilder: (context, index) {
        return Padding(
          padding: EdgeInsets.only(bottom: index == 0 ? 18.0 : 0),
          child: Container(
            width: AppSize.width,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: Theme.of(context).cardColor,
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                SizedBox(
                  width: Get.width * 0.565,
                  child: Container(
                    padding: const EdgeInsets.only(
                      left: AppSize.height12,
                      right: AppSize.height12,
                      top: AppSize.height12,
                      bottom: AppSize.height12,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          salonScreenController.haircutTitle[index],
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              fontSize: AppSize.height16,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishSemiBold,
                              fontWeight: FontWeight.w700,
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color),
                        ),
                        const SizedBox(height: AppSize.height6),
                        Row(
                          children: [
                            Image.asset(
                              AppImage.starIcon,
                              height: AppSize.height12,
                              width: AppSize.width12,
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                            ),
                            const SizedBox(width: AppSize.height2),
                            Text(
                              salonScreenController.reviewHairCut[index],
                              style: TextStyle(
                                color: Theme.of(context)
                                    .appBarTheme
                                    .titleTextStyle
                                    ?.color,
                                fontSize: AppSize.height14,
                                fontWeight: FontWeight.w600,
                                fontStyle: FontStyle.normal,
                                fontFamily: FontFamily.mulishSemiBold,
                              ),
                            ),
                            const SizedBox(
                              width: AppSize.width6,
                            ),
                            Text(
                              salonScreenController.hairCutReviewsText[index],
                              style: TextStyle(
                                color: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.color,
                                fontSize: AppSize.height14,
                                fontWeight: FontWeight.w400,
                                fontFamily: FontFamily.mulishRegular,
                                fontStyle: FontStyle.normal,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: AppSize.height6),
                        RichText(
                          text: TextSpan(
                            text: salonScreenController.haircutPrice1[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishBold,
                              fontWeight: FontWeight.w700,
                              fontSize: AppSize.height14,
                            ),
                            children: [
                              TextSpan(
                                text:
                                    salonScreenController.haircutPrice2[index],
                                style: TextStyle(
                                  decoration: TextDecoration.lineThrough,
                                  color: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.color,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishRegular,
                                  fontWeight: FontWeight.w400,
                                  fontSize: AppSize.height12,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: AppSize.height14),
                        Container(
                          height: 0.5,
                          width: AppSize.width196,
                          color: Theme.of(context).dividerColor,
                        ),
                        const SizedBox(height: AppSize.height14),
                        Text(
                          salonScreenController.hairCutDescription[index],
                          textAlign: TextAlign.start,
                          style: TextStyle(
                              fontSize: AppSize.height12,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishMedium,
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.color),
                        ),
                      ],
                    ),
                  ),
                ),
                Container(
                    height: AppSize.height158,
                    width: AppSize.height114,
                    decoration: BoxDecoration(
                      borderRadius: const BorderRadius.only(
                        topRight: Radius.circular(16),
                        bottomRight: Radius.circular(16),
                      ),
                      color: Theme.of(context).cardColor,
                    ),
                    child: Obx(
                      () => Padding(
                        padding: EdgeInsets.only(
                            right: languageController.arb.value
                                ? 0
                                : AppSize.height12,
                            left: languageController.arb.value
                                ? AppSize.height12
                                : 0,
                            top: AppSize.height12),
                        child: Stack(
                          children: [
                            Image.asset(
                              salonScreenController.hairCutImage[index],
                              width: AppSize.height114,
                              height: AppSize.width114,
                            ),
                            Positioned(
                              bottom: AppSize.height22,
                              left: AppSize.height11,
                              child: Container(
                                alignment: Alignment.center,
                                height: AppSize.height32,
                                width: AppSize.width80,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(6),
                                  color: Theme.of(context).cardColor,
                                  border: Border.all(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .tertiary),
                                ),
                                child: const Text(
                                  AppString.add,
                                  textAlign: TextAlign.start,
                                  style: TextStyle(
                                    fontSize: AppSize.height14,
                                    fontStyle: FontStyle.normal,
                                    fontFamily: FontFamily.mulishBold,
                                    fontWeight: FontWeight.w700,
                                    color: AppColor.primaryColors,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    )),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget haircutDetail2() {
    return ListView.builder(
      controller: scrollController,
      shrinkWrap: true,
      padding: const EdgeInsets.only(top: AppSize.height22),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: salonScreenController.offerList.length,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: AppSize.height18),
          padding: const EdgeInsets.only(
            left: AppSize.height12,
          ),
          width: Get.width,
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
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 12.0, bottom: 12),
                child: SizedBox(
                  width: Get.width * 0.5,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        salonScreenController.haircutTitle[index],
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: AppSize.height16,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w700,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color),
                      ),
                      const SizedBox(height: AppSize.height6),
                      Row(
                        children: [
                          Image.asset(
                            AppImage.starIcon,
                            height: AppSize.height12,
                            width: AppSize.width12,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                          const SizedBox(width: AppSize.height2),
                          Row(
                            children: [
                              Text(
                                salonScreenController.reviewHairCut[index],
                                style: TextStyle(
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color,
                                  fontSize: AppSize.height14,
                                  fontWeight: FontWeight.w600,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishSemiBold,
                                ),
                              ),
                              const SizedBox(
                                width: AppSize.width6,
                              ),
                              Text(
                                salonScreenController.hairCutReviewsText[index],
                                style: TextStyle(
                                  color: Theme.of(context)
                                      .textTheme
                                      .titleMedium
                                      ?.color,
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
                      RichText(
                        text: TextSpan(
                          text: salonScreenController.haircutPrice1[index],
                          style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishBold,
                            fontWeight: FontWeight.w700,
                            fontSize: AppSize.height14,
                          ),
                          children: [
                            TextSpan(
                              text: salonScreenController.haircutPrice2[index],
                              style: TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.color,
                                fontStyle: FontStyle.normal,
                                fontFamily: FontFamily.mulishRegular,
                                fontWeight: FontWeight.w400,
                                fontSize: AppSize.height12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSize.height14),
                      Container(
                        width: Get.width * 0.5 - 12,
                        height: 0.5,
                        color: Theme.of(context).dividerColor,
                      ),
                      const SizedBox(height: AppSize.height14),
                      Text(
                        salonScreenController.hairCutDescription[index],
                        textAlign: TextAlign.start,
                        style: TextStyle(
                            fontSize: AppSize.height12,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishMedium,
                            fontWeight: FontWeight.w500,
                            color:
                                Theme.of(context).textTheme.titleMedium?.color),
                      ),
                    ],
                  ),
                ),
              ),
              Flexible(
                fit: FlexFit.loose,
                child: Container(
                  alignment: Alignment.topCenter,
                  height: Get.width / 2.5,
                  width: Get.width / 2.5,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    color: Theme.of(context).cardColor,
                  ),
                  child: Padding(
                    padding: const EdgeInsets.only(right: AppSize.height12),
                    child: Stack(
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.start,
                          children: [
                            Image.asset(
                              salonScreenController.hairCutImage[index],
                              height: Get.width / 2.5,
                              width: Get.width / 2.5,
                            ),
                          ],
                        ),
                        Positioned(
                          bottom: 0,
                          left: Get.height / 50,
                          right: Get.height / 50,
                          child: Column(
                            children: [
                              Container(
                                alignment: Alignment.center,
                                height: AppSize.height32,
                                width: AppSize.width80,
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(6),
                                  color: Theme.of(context).cardColor,
                                  border: Border.all(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .tertiary),
                                ),
                                child: const Text(
                                  AppString.add,
                                  textAlign: TextAlign.start,
                                  style: TextStyle(
                                    fontSize: AppSize.height14,
                                    fontStyle: FontStyle.normal,
                                    fontFamily: FontFamily.mulishBold,
                                    fontWeight: FontWeight.w700,
                                    color: AppColor.primaryColors,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget faceCareText(context) {
    return Text(
      AppString.faceCareText,
      textAlign: TextAlign.center,
      style: TextStyle(
          fontSize: AppSize.height18,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget faceCareDetail() {
    return ListView.builder(
      shrinkWrap: true,
      padding: const EdgeInsets.only(top: AppSize.height22),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: salonScreenController.faceCareTitle.length,
      itemBuilder: (context, index) {
        return Container(
          width: AppSize.width,
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
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              SizedBox(
                width: Get.width * 0.565,
                child: Container(
                  padding: const EdgeInsets.only(
                    left: AppSize.height12,
                    right: AppSize.height12,
                    top: AppSize.height12,
                    bottom: AppSize.height12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        salonScreenController.faceCareTitle[index],
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: AppSize.height16,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w700,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color),
                      ),
                      const SizedBox(height: AppSize.height6),
                      Row(
                        children: [
                          Image.asset(
                            AppImage.starIcon,
                            height: AppSize.height12,
                            width: AppSize.width12,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                          const SizedBox(width: AppSize.height2),
                          Text(
                            salonScreenController.review45[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w600,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishSemiBold,
                            ),
                          ),
                          const SizedBox(
                            width: AppSize.width6,
                          ),
                          Text(
                            salonScreenController.reviewsDetail[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w400,
                              fontFamily: FontFamily.mulishRegular,
                              fontStyle: FontStyle.normal,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSize.height6),
                      RichText(
                        text: TextSpan(
                          text: salonScreenController.faceCarePrice1[index],
                          style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishBold,
                            fontWeight: FontWeight.w700,
                            fontSize: AppSize.height14,
                          ),
                          children: [
                            TextSpan(
                              text: salonScreenController.haircutPrice2[index],
                              style: TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.color,
                                fontStyle: FontStyle.normal,
                                fontFamily: FontFamily.mulishRegular,
                                fontWeight: FontWeight.w400,
                                fontSize: AppSize.height12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSize.height14),
                      Container(
                        height: 0.5,
                        width: AppSize.width196,
                        color: Theme.of(context).dividerColor,
                      ),
                      const SizedBox(height: AppSize.height14),
                      Text(
                        salonScreenController.faceCareDetail[index],
                        textAlign: TextAlign.start,
                        style: TextStyle(
                            fontSize: AppSize.height12,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishMedium,
                            fontWeight: FontWeight.w500,
                            color:
                                Theme.of(context).textTheme.titleMedium?.color),
                      ),
                    ],
                  ),
                ),
              ),
              Container(
                  height: AppSize.height158,
                  width: AppSize.height114,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    color: Theme.of(context).cardColor,
                  ),
                  child: Obx(
                    () => Padding(
                      padding: EdgeInsets.only(
                          right: languageController.arb.value
                              ? 0
                              : AppSize.height12,
                          left: languageController.arb.value
                              ? AppSize.height12
                              : 0,
                          top: AppSize.height12),
                      child: Stack(
                        children: [
                          Image.asset(
                            salonScreenController.faceCareImage[index],
                            width: AppSize.height114,
                            height: AppSize.width114,
                          ),
                          Positioned(
                            bottom: AppSize.height22,
                            left: AppSize.height11,
                            child: Container(
                              alignment: Alignment.center,
                              height: AppSize.height32,
                              width: AppSize.width80,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(6),
                                color: Theme.of(context).cardColor,
                                border: Border.all(
                                    color:
                                        Theme.of(context).colorScheme.tertiary),
                              ),
                              child: const Text(
                                AppString.add,
                                textAlign: TextAlign.start,
                                style: TextStyle(
                                  fontSize: AppSize.height14,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishBold,
                                  fontWeight: FontWeight.w700,
                                  color: AppColor.primaryColors,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }

  Widget shaveText(context) {
    return Text(
      AppString.shave,
      textAlign: TextAlign.center,
      style: TextStyle(
          fontSize: AppSize.height18,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget cleanShaveDetail() {
    return ListView.builder(
      shrinkWrap: true,
      padding: const EdgeInsets.only(top: AppSize.height22),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: salonScreenController.cleanShaveDetail.length,
      itemBuilder: (context, index) {
        return Container(
          width: AppSize.width,
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
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              SizedBox(
                width: Get.width * 0.565,
                child: Container(
                  padding: const EdgeInsets.only(
                    left: AppSize.height12,
                    right: AppSize.height12,
                    top: AppSize.height12,
                    bottom: AppSize.height12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        salonScreenController.cleanShaveTitle[index],
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: AppSize.height16,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color),
                      ),
                      const SizedBox(height: AppSize.height6),
                      Row(
                        children: [
                          Image.asset(
                            AppImage.starIcon,
                            height: AppSize.height12,
                            width: AppSize.width12,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                          const SizedBox(width: AppSize.height2),
                          Text(
                            salonScreenController.cleanShaveReview45[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w600,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishSemiBold,
                            ),
                          ),
                          const SizedBox(
                            width: AppSize.width6,
                          ),
                          Text(
                            salonScreenController
                                .cleanShaveReviewsDetail[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w400,
                              fontFamily: FontFamily.mulishRegular,
                              fontStyle: FontStyle.normal,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSize.height6),
                      RichText(
                        text: TextSpan(
                          text: salonScreenController.cleanShavePrice1[index],
                          style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishBold,
                            fontWeight: FontWeight.w700,
                            fontSize: AppSize.height14,
                          ),
                          children: [
                            TextSpan(
                              text:
                                  salonScreenController.cleanShavePrice2[index],
                              style: TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.color,
                                fontStyle: FontStyle.normal,
                                fontFamily: FontFamily.mulishRegular,
                                fontWeight: FontWeight.w400,
                                fontSize: AppSize.height12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSize.height14),
                      Container(
                        height: 0.5,
                        width: AppSize.width196,
                        color: Theme.of(context).dividerColor,
                      ),
                      const SizedBox(height: AppSize.height14),
                      Text(
                        salonScreenController.cleanShaveDetail[index],
                        textAlign: TextAlign.start,
                        style: TextStyle(
                            fontSize: AppSize.height12,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishMedium,
                            fontWeight: FontWeight.w500,
                            color:
                                Theme.of(context).textTheme.titleMedium?.color),
                      ),
                    ],
                  ),
                ),
              ),
              Container(
                  height: AppSize.height158,
                  width: AppSize.width114,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    color: Theme.of(context).cardColor,
                  ),
                  child: Obx(
                    () => Padding(
                      padding: EdgeInsets.only(
                        right:
                            languageController.arb.value ? 0 : AppSize.height12,
                        left:
                            languageController.arb.value ? AppSize.height12 : 0,
                        top: AppSize.height12,
                      ),
                      child: Stack(
                        children: [
                          Image.asset(
                            salonScreenController.cleanShaveImage[index],
                            width: AppSize.height114,
                            height: AppSize.width114,
                          ),
                          Positioned(
                            bottom: AppSize.height22,
                            left: AppSize.height11,
                            child: Container(
                              alignment: Alignment.center,
                              height: AppSize.height32,
                              width: AppSize.width80,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(6),
                                color: Theme.of(context).cardColor,
                                border: Border.all(
                                    color:
                                        Theme.of(context).colorScheme.tertiary),
                              ),
                              child: const Text(
                                AppString.add,
                                textAlign: TextAlign.start,
                                style: TextStyle(
                                  fontSize: AppSize.height14,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishBold,
                                  fontWeight: FontWeight.w700,
                                  color: AppColor.primaryColors,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }

  Widget beardGroomingText(context) {
    return Text(
      AppString.beardGroomingText,
      textAlign: TextAlign.center,
      style: TextStyle(
          fontSize: AppSize.height18,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget beardGroomingDetail() {
    return ListView.builder(
      shrinkWrap: true,
      padding: const EdgeInsets.only(top: AppSize.height22),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: salonScreenController.beardTrimmingTitle.length,
      itemBuilder: (context, index) {
        return Container(
          width: AppSize.width,
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
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              SizedBox(
                width: Get.width * 0.565,
                child: Container(
                  padding: const EdgeInsets.only(
                    left: AppSize.height12,
                    right: AppSize.height12,
                    top: AppSize.height12,
                    bottom: AppSize.height12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        salonScreenController.beardTrimmingTitle[index],
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: AppSize.height16,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color),
                      ),
                      const SizedBox(height: AppSize.height6),
                      Row(
                        children: [
                          Image.asset(
                            AppImage.starIcon,
                            height: AppSize.height12,
                            width: AppSize.width12,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                          const SizedBox(width: AppSize.height2),
                          Text(
                            salonScreenController.beardTrimmingReview45[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w600,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishSemiBold,
                            ),
                          ),
                          const SizedBox(
                            width: AppSize.width6,
                          ),
                          Text(
                            salonScreenController
                                .beardTrimmingReviewsDetail[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w400,
                              fontFamily: FontFamily.mulishRegular,
                              fontStyle: FontStyle.normal,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSize.height6),
                      RichText(
                        text: TextSpan(
                          text:
                              salonScreenController.beardTrimmingPrice1[index],
                          style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishBold,
                            fontWeight: FontWeight.w700,
                            fontSize: AppSize.height14,
                          ),
                          children: [
                            TextSpan(
                              text: salonScreenController
                                  .beardTrimmingPrice2[index],
                              style: TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.color,
                                fontStyle: FontStyle.normal,
                                fontFamily: FontFamily.mulishRegular,
                                fontWeight: FontWeight.w400,
                                fontSize: AppSize.height12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSize.height14),
                      Container(
                        height: 0.5,
                        width: AppSize.width196,
                        color: Theme.of(context).dividerColor,
                      ),
                      const SizedBox(height: AppSize.height14),
                      Text(
                        salonScreenController.beardTrimmingDetail[index],
                        textAlign: TextAlign.start,
                        style: TextStyle(
                            fontSize: AppSize.height12,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishMedium,
                            fontWeight: FontWeight.w500,
                            color:
                                Theme.of(context).textTheme.titleMedium?.color),
                      ),
                    ],
                  ),
                ),
              ),
              Container(
                  height: AppSize.height158,
                  width: AppSize.width114,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    color: Theme.of(context).cardColor,
                  ),
                  child: Obx(
                    () => Padding(
                      padding: EdgeInsets.only(
                          right: languageController.arb.value
                              ? 0
                              : AppSize.height12,
                          left: languageController.arb.value
                              ? AppSize.height12
                              : 0,
                          top: AppSize.height12),
                      child: Stack(
                        children: [
                          Image.asset(
                            salonScreenController.cleanShaveImage[index],
                            width: AppSize.height114,
                            height: AppSize.width114,
                          ),
                          Positioned(
                            bottom: AppSize.height22,
                            left: AppSize.height11,
                            child: Container(
                              alignment: Alignment.center,
                              height: AppSize.height32,
                              width: AppSize.width80,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(6),
                                color: Theme.of(context).cardColor,
                                border: Border.all(
                                    color:
                                        Theme.of(context).colorScheme.tertiary),
                              ),
                              child: const Text(
                                AppString.add,
                                textAlign: TextAlign.start,
                                style: TextStyle(
                                  fontSize: AppSize.height14,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishBold,
                                  fontWeight: FontWeight.w700,
                                  color: AppColor.primaryColors,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }

  Widget massageText(context) {
    return Text(
      AppString.massage,
      textAlign: TextAlign.center,
      style: TextStyle(
          fontSize: AppSize.height18,
          fontStyle: FontStyle.normal,
          fontFamily: FontFamily.mulishBold,
          fontWeight: FontWeight.w700,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget massageDetail() {
    return ListView.builder(
      shrinkWrap: true,
      padding: const EdgeInsets.only(top: AppSize.height22),
      physics: const NeverScrollableScrollPhysics(),
      itemCount: salonScreenController.massageDetail.length,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: AppSize.height18),
          width: AppSize.width,
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
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              SizedBox(
                width: Get.width * 0.565,
                child: Container(
                  padding: const EdgeInsets.only(
                    left: AppSize.height12,
                    right: AppSize.height12,
                    top: AppSize.height12,
                    bottom: AppSize.height12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        salonScreenController.massageTitle[index],
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: AppSize.height16,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color),
                      ),
                      const SizedBox(height: AppSize.height6),
                      Row(
                        children: [
                          Image.asset(
                            AppImage.starIcon,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            height: AppSize.height12,
                            width: AppSize.width12,
                          ),
                          const SizedBox(width: AppSize.height2),
                          Text(
                            salonScreenController.massageReview45[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w600,
                              fontStyle: FontStyle.normal,
                              fontFamily: FontFamily.mulishSemiBold,
                            ),
                          ),
                          const SizedBox(
                            width: AppSize.width6,
                          ),
                          Text(
                            salonScreenController.massageReviewsDetail[index],
                            style: TextStyle(
                              color: Theme.of(context)
                                  .textTheme
                                  .titleMedium
                                  ?.color,
                              fontSize: AppSize.height14,
                              fontWeight: FontWeight.w400,
                              fontFamily: FontFamily.mulishRegular,
                              fontStyle: FontStyle.normal,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSize.height6),
                      RichText(
                        text: TextSpan(
                          text: salonScreenController.massagePrice1[index],
                          style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishBold,
                            fontWeight: FontWeight.w700,
                            fontSize: AppSize.height14,
                          ),
                          children: [
                            TextSpan(
                              text: salonScreenController.massagePrice2[index],
                              style: TextStyle(
                                decoration: TextDecoration.lineThrough,
                                color: Theme.of(context)
                                    .textTheme
                                    .titleMedium
                                    ?.color,
                                fontStyle: FontStyle.normal,
                                fontFamily: FontFamily.mulishRegular,
                                fontWeight: FontWeight.w400,
                                fontSize: AppSize.height12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: AppSize.height14),
                      Container(
                        height: 0.5,
                        width: 196,
                        color: Theme.of(context).dividerColor,
                      ),
                      const SizedBox(height: AppSize.height14),
                      Text(
                        salonScreenController.massageDetailSalon[index],
                        textAlign: TextAlign.start,
                        style: TextStyle(
                            fontSize: AppSize.height12,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishMedium,
                            fontWeight: FontWeight.w500,
                            color:
                                Theme.of(context).textTheme.titleMedium?.color),
                      ),
                    ],
                  ),
                ),
              ),
              Container(
                  height: AppSize.height158,
                  width: AppSize.width114,
                  decoration: BoxDecoration(
                    borderRadius: const BorderRadius.only(
                      topRight: Radius.circular(16),
                      bottomRight: Radius.circular(16),
                    ),
                    color: Theme.of(context).cardColor,
                  ),
                  child: Obx(
                    () => Padding(
                      padding: EdgeInsets.only(
                          right: languageController.arb.value
                              ? 0
                              : AppSize.height12,
                          left: languageController.arb.value
                              ? AppSize.height12
                              : 0,
                          top: AppSize.height12),
                      child: Stack(
                        children: [
                          Image.asset(
                            salonScreenController.massageImg[index],
                            width: AppSize.height114,
                            height: AppSize.width114,
                          ),
                          Positioned(
                            bottom: AppSize.height22,
                            left: AppSize.height11,
                            child: Container(
                              alignment: Alignment.center,
                              height: AppSize.height32,
                              width: AppSize.width80,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(6),
                                color: Theme.of(context).cardColor,
                                border: Border.all(
                                    color:
                                        Theme.of(context).colorScheme.tertiary),
                              ),
                              child: const Text(
                                AppString.add,
                                textAlign: TextAlign.start,
                                style: TextStyle(
                                  fontSize: AppSize.height14,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishBold,
                                  fontWeight: FontWeight.w700,
                                  color: AppColor.primaryColors,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
            ],
          ),
        );
      },
    );
  }
}

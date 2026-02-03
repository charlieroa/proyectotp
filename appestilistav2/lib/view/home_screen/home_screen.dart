import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import 'package:home_helper_flutter_ui_kit/config/font_family.dart';
import 'package:home_helper_flutter_ui_kit/controller/home_screen_controller.dart';
import 'package:home_helper_flutter_ui_kit/controller/language_controller.dart';
import 'package:home_helper_flutter_ui_kit/custom_widget/custom_textfield.dart';
import 'package:home_helper_flutter_ui_kit/view/map_screen/map_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/notification_screen/notification_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/popular_services_screen/popular_services_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/salon_screen/salon_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/search_screen/search_screen.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:ui' as ui;
import '../../config/app_icons.dart';
import '../../controller/dark_controller.dart';
import '../../model/carousel_slider_model.dart';
import '../../theme/themes.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  DarkModeController darkModeController = Get.put(DarkModeController());
  final LanguageController languageController = Get.put(LanguageController());
  HomeScreenController homeController = Get.put(HomeScreenController());
  bool boolVariable = true;
  final controller = PageController();
  bool firstTimeVisit = false;
  bool showBottomSheet = false;

  @override
  void initState() {
    Future.delayed(
      const Duration(seconds: 0),
      () async {
        SharedPreferences prefs = await SharedPreferences.getInstance();
        firstTimeVisit = prefs.getBool('first_time_visit') ?? true;

        setState(() {
          showBottomSheet = firstTimeVisit;
        });
      },
    );
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    languageController.loadSelectedLanguage();
    if (showBottomSheet && boolVariable == true) {
      openBottomSheetAfterDelay(context);
    } else if (showBottomSheet && boolVariable != true) {
      return SafeArea(
        child: Scaffold(
          backgroundColor: Theme.of(context).primaryColor,
          body: SingleChildScrollView(
            child: Column(
              children: [
                buildAppbar(),
                const SizedBox(height: AppSize.height24),
                buildPagerView(),
                const SizedBox(height: AppSize.height8),
                Obx(
                  () => Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(
                      carouselSliderList.length,
                      (int index) => buildDot(index: index),
                    ),
                  ),
                ),
                const SizedBox(height: AppSize.height24),
                searchService(context),
                const SizedBox(height: AppSize.height40),
                categoriesText(),
                const SizedBox(height: AppSize.height22),
                categoriesList(),
                const SizedBox(height: AppSize.height40),
                popularService(),
                const SizedBox(height: AppSize.height22),
                popularServiceData(),
                const SizedBox(height: AppSize.height40),
                spaForWomenText(),
                const SizedBox(height: AppSize.height22),
                spaForWomenData(),
                const SizedBox(height: AppSize.height40),
                salonForKidsManText(),
                const SizedBox(height: AppSize.height22),
                salonForKidsManData(),
                const SizedBox(height: AppSize.height40),
                acRepairText(),
                const SizedBox(height: AppSize.height22),
                acRepairData(),
                const SizedBox(height: AppSize.height40),
                quickHomeRepairText(),
                const SizedBox(height: AppSize.height14),
                tapRepairData(),
              ],
            ),
          ),
        ),
      );
    }

    return SafeArea(
      child: Scaffold(
        backgroundColor: Theme.of(context).primaryColor,
        body: SingleChildScrollView(
          child: Column(
            children: [
              buildAppbar(),
              const SizedBox(height: AppSize.height24),
              buildPagerView(),
              const SizedBox(height: AppSize.height8),
              Obx(
                () => Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: List.generate(
                    carouselSliderList.length,
                    (int index) => buildDot(index: index),
                  ),
                ),
              ),
              const SizedBox(height: AppSize.height24),
              searchService(context),
              const SizedBox(height: AppSize.height40),
              categoriesText(),
              const SizedBox(height: AppSize.height22),
              categoriesList(),
              const SizedBox(height: AppSize.height40),
              popularService(),
              const SizedBox(height: AppSize.height22),
              popularServiceData(),
              const SizedBox(height: AppSize.height40),
              spaForWomenText(),
              const SizedBox(height: AppSize.height22),
              spaForWomenData(),
              const SizedBox(height: AppSize.height40),
              salonForKidsManText(),
              const SizedBox(height: AppSize.height22),
              salonForKidsManData(),
              const SizedBox(height: AppSize.height40),
              acRepairText(),
              const SizedBox(height: AppSize.height22),
              acRepairData(),
              const SizedBox(height: AppSize.height40),
              quickHomeRepairText(),
              const SizedBox(height: AppSize.height14),
              tapRepairData(),
            ],
          ),
        ),
      ),
    );
  }

  Widget buildAppbar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(
                height: AppSize.width18,
              ),
              Row(
                children: [
                  Text(
                    AppString.washingtonAveManchester,
                    style: TextStyle(
                        fontFamily: FontFamily.mulishMedium,
                        fontWeight: FontWeight.w500,
                        fontSize: AppSize.height14,
                        fontStyle: FontStyle.normal,
                        color: Theme.of(context).textTheme.titleMedium?.color),
                  ),
                  Image.asset(
                    AppIcons.arrowDownIcon,
                    height: AppSize.height12,
                    width: AppSize.height12,
                    color: Theme.of(context).textTheme.titleMedium?.color,
                  ),
                ],
              ),
              const SizedBox(height: AppSize.height4),
              Text(
                AppString.whatYouAreLooking,
                style: TextStyle(
                  fontFamily: FontFamily.mulishExtraBold,
                  fontWeight: FontWeight.w800,
                  fontSize: AppSize.height22,
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                ),
              )
            ],
          ),
          const Spacer(),
          GestureDetector(
            onTap: () {
              Get.to(NotificationScreen());
            },
            child: Container(
              padding: const EdgeInsets.all(AppSize.height13),
              margin: const EdgeInsets.only(top: 30),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border:
                    Border.all(color: Theme.of(context).colorScheme.tertiary),
              ),
              child: Image.asset(
                ((Theme.of(context).extensions.values.firstWhere(
                          (extension) => extension is RegistrationStyle,
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
                        ) as RegistrationStyle)
                    .iconBuilder),
                height: AppSize.height20,
                width: AppSize.width20,
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget buildPagerView() {
    return SizedBox(
      height: AppSize.height200,
      child: PageView.builder(
        controller: controller,
        allowImplicitScrolling: true,
        onPageChanged: (value) {
          homeController.pageViewIndex.value = value;
        },
        itemCount: carouselSliderList.length,
        scrollDirection: Axis.horizontal,
        itemBuilder: (BuildContext context, int index) {
          return Container(
            width: Get.width,
            margin: const EdgeInsets.symmetric(horizontal: 20),
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
            ),
            child: Image.asset(
              carouselSliderList[index].image ?? "",
              height: AppSize.height164,
              width: AppSize.width350,
              fit: BoxFit.fill,
            ),
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
        color: homeController.pageViewIndex.value == index
            ? AppColor.primaryColors
            : AppColor.indicatorColor,
        borderRadius: BorderRadius.circular(AppSize.height11),
      ),
    );
  }

  Widget searchService(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      child: Row(
        children: [
          Expanded(
            child: CustomTextField(
              controller: homeController.searchController,
              hintText: AppString.searchForACServices,
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
          Container(
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
        ],
      ),
    );
  }

  Widget categoriesText() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      child: Row(
        children: [
          Text(
            AppString.categories,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height18,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishBold,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color),
          ),
          const Spacer(),
          const Text(
            AppString.seeAll,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishSemiBold,
                fontWeight: FontWeight.w600,
                color: AppColor.primaryColors),
          ),
        ],
      ),
    );
  }

  Widget categoriesList() {
    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      shrinkWrap: true,
      itemCount: homeController.colorList.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: AppSize.height22,
          mainAxisSpacing: AppSize.height20),
      itemBuilder: (context, index) {
        return GestureDetector(
          onTap: () {
            if (index == 0 && homeController.nameList[index] == 'Salon') {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => SalonScreen()),
              );
            }
          },
          child: Container(
            padding: const EdgeInsets.only(top: AppSize.height10),
            height: AppSize.height102,
            width: AppSize.width102,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: homeController.colorList[index],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Image.asset(homeController.imageList[index],
                    height: AppSize.height32, width: AppSize.width32),
                const SizedBox(height: AppSize.height16),
                Text(
                  homeController.nameList[index],
                  style: const TextStyle(
                    fontFamily: FontFamily.mulishSemiBold,
                    fontStyle: FontStyle.normal,
                    fontWeight: FontWeight.w600,
                    color: AppColor.secondaryColor,
                    fontSize: AppSize.height14,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget popularService() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      child: Row(
        children: [
          Text(
            AppString.popularService,
            textAlign: TextAlign.center,
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
              Get.to(PopularServicesScreen())!.then(
                  (value) => FocusManager.instance.primaryFocus?.unfocus());
            },
            child: const Text(
              AppString.seeAll,
              textAlign: TextAlign.center,
              style: TextStyle(
                  fontSize: AppSize.height14,
                  fontStyle: FontStyle.normal,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  color: AppColor.primaryColors),
            ),
          ),
        ],
      ),
    );
  }

  Widget popularServiceData() {
    return SizedBox(
      height: AppSize.height252,
      child: ListView.builder(
        shrinkWrap: true,
        clipBehavior: Clip.none,
        padding: const EdgeInsets.only(left: AppSize.height20),
        scrollDirection: Axis.horizontal,
        itemCount: homeController.popularServiceImageList.length,
        itemBuilder: (context, index) {
          return Container(
            width: AppSize.height235,
            height: AppSize.height252,
            margin: const EdgeInsets.only(right: AppSize.height20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              color: Theme.of(context).cardColor,
              boxShadow: [
                BoxShadow(
                  color: Theme.of(context).cardTheme.shadowColor!,
                  spreadRadius: AppSize.height0,
                  blurRadius: AppSize.height18,
                  offset: const Offset(AppSize.height0, AppSize.height4),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  clipBehavior: Clip.antiAliasWithSaveLayer,
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(12),
                    topLeft: Radius.circular(12),
                  ),
                  child: Image.asset(
                    homeController.popularServiceImageList[index],
                    width: AppSize.width271,
                    height: AppSize.height165,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: AppSize.height10),
                Padding(
                  padding: const EdgeInsets.only(
                      left: AppSize.height12, right: AppSize.height12),
                  child: Text(
                    homeController.popularServiceStringList[index],
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
                ),
                const SizedBox(height: AppSize.height4),
                Padding(
                  padding: const EdgeInsets.only(
                      left: AppSize.height12, right: AppSize.height12),
                  child: Row(
                    children: [
                      Image.asset(AppImage.starIcon,
                          width: AppSize.height12,
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color),
                      const SizedBox(width: AppSize.width3),
                      Text(
                        homeController.popularServiceStringRateList[index],
                        style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontSize: AppSize.height12,
                            fontWeight: FontWeight.w600,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold),
                      ),
                      const SizedBox(
                        width: 6,
                      ),
                      Text(
                        homeController.popularServiceStringReviewsList[index],
                        style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontSize: AppSize.height12,
                          fontWeight: FontWeight.w400,
                          fontStyle: FontStyle.normal,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSize.height8),
                Padding(
                  padding: const EdgeInsets.only(
                      left: AppSize.height12, right: AppSize.height12),
                  child: Row(
                    children: [
                      RichText(
                        text: TextSpan(
                          text: homeController.price[index],
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
                              text: homeController.price2[index],
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
                      )
                    ],
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  Widget spaForWomenText() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.width20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            AppString.spaForWomen,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height18,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishBold,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color),
          ),
          const Text(
            AppString.seeAll,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishSemiBold,
                fontWeight: FontWeight.w600,
                color: AppColor.primaryColors),
          ),
        ],
      ),
    );
  }

  Widget spaForWomenData() {
    return SizedBox(
        height: AppSize.height214,
        child: Obx(
          () => ListView.builder(
            itemCount: homeController.beautyTherapyIMG.length,
            shrinkWrap: true,
            padding: EdgeInsets.only(
                right: languageController.arb.value ? AppSize.height20 : 0,
                left: languageController.arb.value ? 0 : AppSize.height20),
            clipBehavior: Clip.none,
            addSemanticIndexes: true,
            scrollDirection: Axis.horizontal,
            itemBuilder: (context, index) {
              return Stack(
                children: [
                  Container(
                    width: AppSize.width159,
                    margin: EdgeInsets.only(
                        left:
                            languageController.arb.value ? AppSize.height20 : 0,
                        right: languageController.arb.value
                            ? 0
                            : AppSize.height20),
                    decoration:
                        BoxDecoration(borderRadius: BorderRadius.circular(14)),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.asset(
                        homeController.beautyTherapyIMG[index],
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    top: AppSize.height180,
                    child: ClipRRect(
                      borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(14),
                          bottomRight: Radius.circular(14)),
                      child: BackdropFilter(
                        filter: ui.ImageFilter.blur(
                          sigmaX: 6.0,
                          sigmaY: 6.0,
                        ),
                        child: Container(
                          width: AppSize.width159,
                          decoration: BoxDecoration(
                            color: Colors.transparent,
                            borderRadius: const BorderRadius.only(
                                bottomLeft: Radius.circular(14),
                                bottomRight: Radius.circular(14)),
                            boxShadow: [
                              BoxShadow(
                                color: Theme.of(context).cardTheme.shadowColor!,
                                spreadRadius: AppSize.height5,
                                blurRadius: 0.1,
                                offset: const Offset(AppSize.height0, -0.1),
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              homeController.beautyTherapyName[index],
                              style: const TextStyle(
                                fontFamily: FontFamily.mulishMedium,
                                fontSize: AppSize.height14,
                                fontStyle: FontStyle.normal,
                                fontWeight: FontWeight.w500,
                                color: AppColor.whiteColor,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  )
                ],
              );
            },
          ),
        ));
  }

  Widget salonForKidsManText() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.width20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            AppString.salonForKidsMan,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height18,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishBold,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color),
          ),
          const Text(
            AppString.seeAll,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishSemiBold,
                fontWeight: FontWeight.w600,
                color: AppColor.primaryColors),
          ),
        ],
      ),
    );
  }

  Widget salonForKidsManData() {
    return SizedBox(
        height: AppSize.height214,
        child: Obx(
          () => ListView.builder(
            itemCount: homeController.salonForKidsManIMG.length,
            shrinkWrap: true,
            padding: EdgeInsets.only(
                left: languageController.arb.value ? 0 : AppSize.height20,
                right: languageController.arb.value ? AppSize.height20 : 0),
            scrollDirection: Axis.horizontal,
            itemBuilder: (context, index) {
              return Stack(
                children: [
                  Container(
                    margin: EdgeInsets.only(
                        right:
                            languageController.arb.value ? 0 : AppSize.height20,
                        left: languageController.arb.value
                            ? AppSize.height20
                            : 0),
                    height: AppSize.height214,
                    width: AppSize.width159,
                    decoration:
                        BoxDecoration(borderRadius: BorderRadius.circular(14)),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(14),
                      child: Image.asset(
                        homeController.salonForKidsManIMG[index],
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    top: 180,
                    child: ClipRRect(
                      borderRadius: const BorderRadius.only(
                          bottomLeft: Radius.circular(14),
                          bottomRight: Radius.circular(14)),
                      child: BackdropFilter(
                        filter: ui.ImageFilter.blur(
                          sigmaX: 6.0,
                          sigmaY: 6.0,
                        ),
                        child: Container(
                          width: 159,
                          decoration: BoxDecoration(
                            color: Colors.transparent,
                            borderRadius: const BorderRadius.only(
                                bottomLeft: Radius.circular(14),
                                bottomRight: Radius.circular(14)),
                            boxShadow: [
                              BoxShadow(
                                color: Theme.of(context).cardTheme.shadowColor!,
                                spreadRadius: AppSize.height5,
                                blurRadius: 0.1,
                                offset: const Offset(AppSize.height0, -0.1),
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              homeController.salonForKidsManName[index],
                              style: const TextStyle(
                                fontFamily: FontFamily.mulishMedium,
                                fontSize: AppSize.height14,
                                fontStyle: FontStyle.normal,
                                fontWeight: FontWeight.w500,
                                color: AppColor.whiteColor,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  )
                ],
              );
            },
          ),
        ));
  }

  Widget acRepairText() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            AppString.acRepair,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height18,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishBold,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color),
          ),
          const Text(
            AppString.seeAll,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishSemiBold,
                fontWeight: FontWeight.w600,
                color: AppColor.primaryColors),
          ),
        ],
      ),
    );
  }

  Widget acRepairData() {
    return SizedBox(
      height: AppSize.height252,
      child: ListView.builder(
        shrinkWrap: true,
        clipBehavior: Clip.none,
        padding: const EdgeInsets.only(left: AppSize.height20),
        scrollDirection: Axis.horizontal,
        itemCount: homeController.popularServiceImageList.length,
        itemBuilder: (context, index) {
          return Container(
            margin: const EdgeInsets.only(right: AppSize.width20),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Theme.of(context).cardTheme.shadowColor!,
                  spreadRadius: AppSize.height0,
                  blurRadius: AppSize.height18,
                  offset: const Offset(AppSize.height0, AppSize.height4),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  clipBehavior: Clip.antiAliasWithSaveLayer,
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(12),
                    topLeft: Radius.circular(12),
                  ),
                  child: Image.asset(
                    homeController.acRepairIMG[index],
                    width: AppSize.height235,
                    height: AppSize.height136,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: AppSize.height10),
                Padding(
                  padding: const EdgeInsets.only(
                      left: AppSize.height12, right: AppSize.height12),
                  child: Text(
                    homeController.acServicesName[index],
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
                ),
                const SizedBox(height: AppSize.height4),
                Padding(
                  padding: const EdgeInsets.only(
                      left: AppSize.height12, right: AppSize.height12),
                  child: Row(
                    children: [
                      Image.asset(
                        AppImage.starIcon,
                        width: AppSize.height12,
                        color:
                            Theme.of(context).appBarTheme.titleTextStyle?.color,
                      ),
                      const SizedBox(width: AppSize.width3),
                      Text(
                        homeController.popularServiceStringRateList[index],
                        style: TextStyle(
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            fontSize: AppSize.height12,
                            fontWeight: FontWeight.w600,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold),
                      ),
                      const SizedBox(
                        width: AppSize.width6,
                      ),
                      Text(
                        homeController.popularServiceStringReviewsList[index],
                        style: TextStyle(
                          color: Theme.of(context).textTheme.titleMedium?.color,
                          fontSize: AppSize.height12,
                          fontWeight: FontWeight.w400,
                          fontStyle: FontStyle.normal,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSize.height8),
                Padding(
                  padding: const EdgeInsets.only(
                      left: AppSize.height12, right: AppSize.height12),
                  child: Row(
                    children: [
                      RichText(
                        text: TextSpan(
                          text: homeController.price[index],
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
                              text: homeController.price2[index],
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
                      )
                    ],
                  ),
                )
              ],
            ),
          );
        },
      ),
    );
  }

  Widget quickHomeRepairText() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            AppString.quickHomeRepairs,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height18,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishBold,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color),
          ),
          const Text(
            AppString.seeAll,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishSemiBold,
                fontWeight: FontWeight.w600,
                color: AppColor.primaryColors),
          ),
        ],
      ),
    );
  }

  Widget tapRepairData() {
    return SizedBox(
      height: 230,
      child: ListView.builder(
        shrinkWrap: true,
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.only(left: AppSize.height20),
        itemCount: homeController.popularServiceImageList.length,
        clipBehavior: Clip.none,
        itemBuilder: (context, index) {
          return Container(
            margin: const EdgeInsets.only(right: AppSize.height20),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(14)),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  clipBehavior: Clip.antiAliasWithSaveLayer,
                  borderRadius: const BorderRadius.only(
                    topRight: Radius.circular(14),
                    topLeft: Radius.circular(14),
                  ),
                  child: Image.asset(
                    homeController.tapRepair[index],
                    width: AppSize.height128,
                    height: AppSize.width140,
                  ),
                ),
                const SizedBox(height: AppSize.height5),
                Text(
                  homeController.quickHomeServices[index],
                  textAlign: TextAlign.center,
                  style: TextStyle(
                      fontSize: AppSize.height16,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color),
                ),
                const SizedBox(height: AppSize.height4),
                Row(
                  children: [
                    Image.asset(
                      AppImage.starIcon,
                      width: AppSize.height12,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                    const SizedBox(width: AppSize.width3),
                    Text(
                      homeController.tapRepairReviews[index],
                      style: TextStyle(
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                          fontSize: AppSize.height12,
                          fontWeight: FontWeight.w600,
                          fontStyle: FontStyle.normal,
                          fontFamily: FontFamily.mulishSemiBold),
                    ),
                    const SizedBox(
                      width: AppSize.width6,
                    ),
                    Text(
                      homeController.tapRepairReviewsList[index],
                      style: TextStyle(
                        color: Theme.of(context).textTheme.titleMedium?.color,
                        fontSize: AppSize.height12,
                        fontWeight: FontWeight.w400,
                        fontStyle: FontStyle.normal,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSize.height8),
                Text(
                  homeController.quickHomePrices[index],
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontSize: AppSize.height14,
                      fontWeight: FontWeight.w700,
                      fontStyle: FontStyle.normal,
                      fontFamily: FontFamily.mulishBold),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void openBottomSheetAfterDelay(BuildContext context) {
    Future.delayed(const Duration(seconds: 2), () {
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
        builder: (context) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
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
                          top: AppSize.height22,
                          bottom: AppSize.height22,
                        ),
                        child: Text(
                          AppString.close,
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
                        top: AppSize.height24,
                        left: AppSize.height20,
                        right: AppSize.height20,
                      ),
                      child: Container(
                          width: Get.width,
                          decoration: BoxDecoration(
                            color: Theme.of(context).cardColor,
                            borderRadius: BorderRadius.circular(12),
                            boxShadow: [
                              BoxShadow(
                                color:
                                    Theme.of(context).cardTheme.shadowColor!,
                                spreadRadius: AppSize.height0,
                                blurRadius: AppSize.height18,
                                offset: const Offset(
                                    AppSize.height0, AppSize.height4),
                              ),
                            ],
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(10.0),
                            child: Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  mainAxisAlignment: MainAxisAlignment.start,
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      AppString.locationPermission,
                                      style: TextStyle(
                                        fontFamily: FontFamily.mulishSemiBold,
                                        fontSize: AppSize.height16,
                                        fontWeight: FontWeight.w600,
                                        fontStyle: FontStyle.normal,
                                        color: Theme.of(context)
                                            .appBarTheme
                                            .titleTextStyle
                                            ?.color,
                                      ),
                                    ),
                                    const SizedBox(
                                      height: AppSize.height3,
                                    ),
                                    Text(
                                      AppString.enableToLocation,
                                      style: TextStyle(
                                        fontFamily: FontFamily.mulishMedium,
                                        fontSize: AppSize.height14,
                                        fontWeight: FontWeight.w500,
                                        fontStyle: FontStyle.normal,
                                        color: Theme.of(context)
                                            .textTheme
                                            .titleMedium
                                            ?.color,
                                      ),
                                    ),
                                  ],
                                ),
                                GestureDetector(
                                  onTap: () {
                                    Get.to(MapScreen());
                                  },
                                  child: Container(
                                    decoration: const BoxDecoration(),
                                    child: Image.asset(
                                      AppIcons.locationBottomSheetIcon,
                                      width: AppSize.width42,
                                      height: AppSize.height42,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(
                          top: AppSize.height40,
                          left: AppSize.height20,
                          right: AppSize.height20),
                      child: Row(
                        children: [
                          Text(
                            AppString.selectASave,
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
                          const Spacer(),
                          const Text(
                            AppString.seeAll,
                            style: TextStyle(
                              fontFamily: FontFamily.mulishSemiBold,
                              fontSize: AppSize.height16,
                              fontWeight: FontWeight.w600,
                              fontStyle: FontStyle.normal,
                              color: AppColor.primaryColors,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(
                          top: AppSize.height18,
                          left: AppSize.height20,
                          right: AppSize.height20),
                      child: Container(
                        width: Get.width,
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Theme.of(context).cardTheme.shadowColor!,
                              spreadRadius: AppSize.height0,
                              blurRadius: AppSize.height18,
                              offset: const Offset(
                                  AppSize.height0, AppSize.height4),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.only(
                            top: AppSize.height12,
                            bottom: AppSize.height11,
                            left: AppSize.height12,
                            right: AppSize.height12,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                AppString.home,
                                style: TextStyle(
                                  fontFamily: FontFamily.mulishSemiBold,
                                  fontSize: AppSize.height14,
                                  fontWeight: FontWeight.w600,
                                  fontStyle: FontStyle.normal,
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color,
                                ),
                              ),
                              const SizedBox(height: AppSize.height4),
                              Text(
                                AppString.addressWashington,
                                textAlign: TextAlign.justify,
                                style: TextStyle(
                                  fontFamily: FontFamily.mulishMedium,
                                  fontSize: AppSize.height12,
                                  fontWeight: FontWeight.w500,
                                  fontStyle: FontStyle.normal,
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
                    Padding(
                      padding: const EdgeInsets.only(
                          top: AppSize.height18,
                          left: AppSize.height20,
                          right: AppSize.height20),
                      child: Container(
                        width: Get.width,
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Theme.of(context).cardTheme.shadowColor!,
                              spreadRadius: AppSize.height0,
                              blurRadius: AppSize.height18,
                              offset: const Offset(
                                  AppSize.height0, AppSize.height4),
                            ),
                          ],
                        ),
                        child: Padding(
                          padding: const EdgeInsets.only(
                              top: AppSize.height12,
                              bottom: AppSize.height11,
                              left: AppSize.height12,
                              right: AppSize.height12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                AppString.office,
                                style: TextStyle(
                                  fontFamily: FontFamily.mulishSemiBold,
                                  fontSize: AppSize.height14,
                                  fontWeight: FontWeight.w600,
                                  fontStyle: FontStyle.normal,
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color,
                                ),
                              ),
                              const SizedBox(height: AppSize.height4),
                              Text(
                                AppString.addressSyracuse,
                                textAlign: TextAlign.justify,
                                style: TextStyle(
                                  fontFamily: FontFamily.mulishMedium,
                                  fontSize: AppSize.height12,
                                  fontWeight: FontWeight.w500,
                                  fontStyle: FontStyle.normal,
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
                    Padding(
                      padding: const EdgeInsets.only(
                          bottom: AppSize.height18,
                          top: AppSize.height18,
                          left: AppSize.height20,
                          right: AppSize.height20),
                      child: CustomTextField(
                        controller: homeController.searchBottomController,
                        hintText: AppString.searchLocationManually,
                        contentPadding: const EdgeInsets.only(
                            left: AppSize.height11,
                            top: AppSize.height16,
                            bottom: AppSize.height16,
                            right: 1),
                        fontFamily: FontFamily.mulishRegular,
                        fontSize: AppSize.height14,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w400,
                        onTap: () async {
                          bool result = await Navigator.push(
                            context,
                            MaterialPageRoute(
                                builder: (context) => SearchScreen()),
                          );
                          FocusManager.instance.primaryFocus?.unfocus();

                          boolVariable = result;
                          setState(() {});

                          Get.back();
                        },
                        prefixIcon: Padding(
                          padding:
                              const EdgeInsets.only(left: AppSize.height10),
                          child: Image.asset(
                            AppIcons.searchBottomSheetIcon,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                            width: AppSize.width20,
                            height: AppSize.width20,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
        context: Get.context as BuildContext,
      ).then((value) {
        SharedPreferences.getInstance().then((prefs) {
          prefs.setBool('first_time_visit', false);
        });
      });
    });
  }
}

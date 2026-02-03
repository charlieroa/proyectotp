import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_icons.dart';
import 'package:home_helper_flutter_ui_kit/config/app_color.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import 'package:home_helper_flutter_ui_kit/config/font_family.dart';
import 'package:home_helper_flutter_ui_kit/controller/language_controller.dart';
import '../../controller/home_controller.dart';

class BottomScreen extends StatefulWidget {
  final int initialIndex;

  const BottomScreen({Key? key, required this.initialIndex}) : super(key: key);

  @override
  State<BottomScreen> createState() => _BottomScreenState();
}

class _BottomScreenState extends State<BottomScreen> {
  HomeController homeController = Get.put(HomeController());
  PageController pageController = PageController();
  int currentIndex = 0;
  final LanguageController languageController = Get.put(LanguageController());

  @override
  void initState() {
    super.initState();

    currentIndex = widget.initialIndex;
    pageController = PageController(initialPage: currentIndex);
  }

  @override
  Widget build(BuildContext context) {
    languageController.loadSelectedLanguage();
    return Scaffold(
      backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
      body: PageView(
          controller: pageController,
          onPageChanged: (index) {
            setState(() {
              currentIndex = index;
            });
          },
          children: homeController.bottomPageList),
      bottomNavigationBar: buildCustomBottomNavigationBar(),
    );
  }

  Widget buildCustomBottomNavigationBar() {
    return Container(
      padding: const EdgeInsets.only(
          top: AppSize.height5, bottom: AppSize.height5, left: 20, right: 20),
      height: 80,
      decoration: BoxDecoration(
          boxShadow: [
            BoxShadow(
              color: Theme.of(context).colorScheme.shadow,
              spreadRadius: 16,
              blurRadius: 16,
              offset: const Offset(0, 10),
            ),
          ],
          color: Theme.of(context).appBarTheme.backgroundColor,
          borderRadius: const BorderRadius.only(
            topRight: Radius.circular(AppSize.height24),
            topLeft: Radius.circular(AppSize.height24),
          )),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          buildNavItem(
            currentIndex == 0,
            AppIcons.homeFillIcon,
            AppIcons.homeIcon,
            AppString.home,
            onTap: () {
              navigateToPage(0);
            },
          ),
          buildNavItem(
            currentIndex == 1,
            AppIcons.bookingFillIcon,
            AppIcons.bookingIcon,
            "Fichero",
            onTap: () {
              navigateToPage(1);
            },
          ),
          buildNavItem(
            currentIndex == 2,
            AppIcons.cartFillIcon,
            AppIcons.cartIcon,
            "Producto",
            onTap: () {
              navigateToPage(2);
            },
          ),
          buildNavItem(
            currentIndex == 3,
            AppIcons.profileFillIcon,
            AppIcons.profileIcon,
            AppString.profile,
            onTap: () {
              navigateToPage(3);
            },
          ),
        ],
      ),
    );
  }

  Widget buildNavItem(
    bool isSelected,
    String selectedIcon,
    String unselectedIcon,
    String label, {
    required VoidCallback onTap,
  }) {
    return GestureDetector(
        onTap: onTap,
        child: Obx(
          () => Padding(
            padding: EdgeInsets.only(
                left: languageController.arb.value
                    ? isSelected
                        ? Get.width / 50
                        : 0
                    : 0,
                right: languageController.arb.value
                    ? 0
                    : isSelected
                        ? Get.width / 50
                        : 0),
            child: Container(
              height: isSelected ? Get.width / 7.7 : Get.width / 6,
              width: isSelected ? Get.width / 2.3 : Get.width / 7.3,
              decoration: isSelected
                  ? BoxDecoration(
                      color: isSelected
                          ? Theme.of(context).appBarTheme.titleTextStyle?.color
                          : AppColor.loginBgImageColor,
                      borderRadius: BorderRadius.circular(40),
                    )
                  : null,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Flexible(
                    child: isSelected
                        ? Image.asset(
                            isSelected ? selectedIcon : unselectedIcon,
                            color: isSelected
                                ? Theme.of(context)
                                    .colorScheme
                                    .tertiaryContainer
                                : AppColor.secondaryColor,
                            height: AppSize.height22,
                            width: AppSize.width22,
                          )
                        : Container(
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: Theme.of(context)
                                  .colorScheme
                                  .secondaryContainer,
                            ),
                            child: Center(
                              child: Image.asset(
                                isSelected ? selectedIcon : unselectedIcon,
                                width: AppSize.height22,
                                height: AppSize.width22,
                                color: Theme.of(context)
                                    .appBarTheme
                                    .titleTextStyle
                                    ?.color,
                              ),
                            ),
                          ),
                  ),
                  const SizedBox(width: AppSize.width6),
                  if (isSelected)
                    Text(
                      label,
                      style: TextStyle(
                        fontFamily: FontFamily.mulishSemiBold,
                        fontStyle: FontStyle.normal,
                        fontSize: AppSize.height16,
                        fontWeight: FontWeight.w600,
                        color: Theme.of(context).colorScheme.tertiaryContainer,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ));
  }

  void navigateToPage(int pageIndex) {
    pageController.animateToPage(
      pageIndex,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }
}

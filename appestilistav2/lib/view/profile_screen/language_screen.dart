import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/language_controller.dart';
import '../../custom_widget/custom_textfield.dart';

class LanguageScreen extends StatelessWidget {
  LanguageScreen({Key? key}) : super(key: key);

  final LanguageController languageController = Get.put(LanguageController());

  @override
  Widget build(BuildContext context) {
    languageController.loadSelectedLanguage();
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      resizeToAvoidBottomInset: true,
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
                  Obx(() => RotationTransition(
                    turns: AlwaysStoppedAnimation(languageController.arb.value?0.5:1.0),
                    child: GestureDetector(
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
                  ),),
                  const SizedBox(width: AppSize.height8),
                  Text(
                    AppString.languages.tr,
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
              const SizedBox(height: AppSize.height22),
              SizedBox(
                height: AppSize.height52,
                child: CustomTextField(
                  controller: TextEditingController(),
                  hintText: AppString.searchLanguage.tr,
                  hintFontSize: AppSize.height14,
                  hintTextColor: AppColor.placeholderDarkMode,
                  hintTextWeight: FontWeight.w400,
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
                  prefixIcon: Image.asset(AppIcons.searchIcon,
                      width: AppSize.height18,
                      height: AppSize.height18,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color),
                ),
              ),
              const SizedBox(height: AppSize.height24),
              Obx(
                () => ListView.builder(
                    itemCount: languageController.languagesList.length,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemBuilder: (BuildContext context, int index) {
                      return Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Obx(
                            () => GestureDetector(
                              onTap: () {
                                languageController
                                    .selectedContainerIndex.value = index;
                                languageController.changeLanguage(
                                    language: languageController
                                        .languagesList[index]);
                                languageController.languageName.value =
                                    languageController.languagesList[index];
                              },
                              child: Container(
                                width: double.infinity,
                                margin: EdgeInsets.only(
                                    bottom: languageController.languageName ==
                                            languageController
                                                .languagesList[index]
                                        ? AppSize.height8
                                        : AppSize.height8,
                                    top: languageController.languageName ==
                                            languageController
                                                .languagesList[index]
                                        ? AppSize.height9
                                        : AppSize.height9),
                                padding: EdgeInsets.only(
                                    bottom: languageController.languageName ==
                                            languageController
                                                .languagesList[index]
                                        ? AppSize.height17
                                        : AppSize.height0,
                                    top: languageController.languageName ==
                                            languageController
                                                .languagesList[index]
                                        ? AppSize.height17
                                        : AppSize.height0),
                                decoration: BoxDecoration(
                                    color: languageController.languageName ==
                                            languageController
                                                .languagesList[index]
                                        ? Theme.of(context)
                                            .expansionTileTheme
                                            .textColor
                                        : Theme.of(context).primaryColor,
                                    borderRadius: BorderRadius.circular(
                                      languageController.languageName ==
                                              languageController
                                                  .languagesList[index]
                                          ? 12
                                          : 0,
                                    ),
                                    border: Border.all(
                                      width: languageController.languageName ==
                                              languageController
                                                  .languagesList[index]
                                          ? 1
                                          : 0,
                                      color: languageController.languageName ==
                                              languageController
                                                  .languagesList[index]
                                          ? AppColor.primaryColorDarkMode
                                          : Theme.of(context).primaryColor,
                                    )),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: AppSize.height20),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          languageController
                                              .languagesList[index],
                                          style: TextStyle(
                                            fontFamily:
                                                FontFamily.mulishSemiBold,
                                            fontSize: AppSize.height14,
                                            fontWeight: FontWeight.w600,
                                            color: Theme.of(context)
                                                .appBarTheme
                                                .titleTextStyle
                                                ?.color,
                                          ),
                                        ),
                                      ),
                                      Image(
                                          image: AssetImage(
                                            languageController.languageName ==
                                                    languageController
                                                        .languagesList[index]
                                                ? AppIcons.fillRound
                                                : AppIcons.emptyRound,
                                          ),
                                          width: AppSize.height18,
                                          height: AppSize.height18,
                                          color:
                                              languageController.languageName ==
                                                      languageController
                                                          .languagesList[index]
                                                  ? Theme.of(context)
                                                      .appBarTheme
                                                      .titleTextStyle
                                                      ?.color
                                                  : Theme.of(context)
                                                      .disabledColor),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 10)
                        ],
                      );
                    }),
              )
            ],
          ),
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.only(
          left: AppSize.height24,
          right: AppSize.height24,
          bottom: AppSize.height24,
        ),
        child: GestureDetector(
          onTap: () {
            Get.back();
          },
          child: Container(
            height: AppSize.height48,
            width: double.infinity,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: AppColor.primaryColorDarkMode,
              borderRadius: BorderRadius.circular(AppSize.height14),
            ),
            child:  Text(
              AppString.keepGoing.tr,
              style: const TextStyle(
                fontWeight: FontWeight.w600,
                fontFamily: FontFamily.mulishMedium,
                fontSize: AppSize.height14,
                color: AppColor.whiteColor,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

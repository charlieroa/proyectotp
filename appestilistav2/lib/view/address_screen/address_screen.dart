import 'package:cupertino_will_pop_scope/cupertino_will_pop_scope.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_icons.dart';
import 'package:home_helper_flutter_ui_kit/controller/address_controller.dart';
import 'package:home_helper_flutter_ui_kit/custom_widget/common_button.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/dark_controller.dart';
import '../../custom_widget/custom_textfield.dart';

class AddressScreen extends StatefulWidget {
  const AddressScreen({Key? key, required this.edit}) : super(key: key);
  final bool edit;

  @override
  State<AddressScreen> createState() => _AddressScreenState();
}

class _AddressScreenState extends State<AddressScreen> {
  final DarkModeController darkModeController = Get.put(DarkModeController());

  final AddressController addressController = Get.put(AddressController());

  final ScrollController scrollController = ScrollController();

  @override
  Widget build(BuildContext context) {
    widget.edit == true
        ? addressController.nameController.text = AppString.henryCooper
        : null;
    widget.edit == true ? addressController.isTap.value = true : null;
    widget.edit == true
        ? addressController.emailController.text = AppString.exampleMail
        : null;
    widget.edit == true
        ? addressController.pinCodeController.text = AppString.pinCodeNo
        : null;
    widget.edit == true
        ? addressController.stateController.text = AppString.gujarat
        : null;
    widget.edit == true
        ? addressController.cityController.text = AppString.surat
        : null;
    widget.edit == true
        ? addressController.houseAddressController.text = AppString.home70
        : null;
    widget.edit == true
        ? addressController.roadAreaController.text = AppString.vipRoad
        : null;
    widget.edit == true
        ? addressController.landMarkController.text = AppString.vipRoad
        : null;

    scrollController.addListener(() {
      if (scrollController.offset > 0) {
        addressController.updateShowShadow(true);
      } else {
        addressController.updateShowShadow(false);
      }
    });
    return ConditionalWillPopScope(
      onWillPop: () async {
        addressController.nameController.clear();
        addressController.emailController.clear();
        addressController.pinCodeController.clear();
        addressController.stateController.clear();
        addressController.cityController.clear();
        addressController.houseAddressController.clear();

        addressController.roadAreaController.clear();

        addressController.landMarkController.clear();
        addressController.isTap.value = false;
        addressController.isWorkTap.value = false;
        addressController.isOfficeTap.value = false;
        return true;
      },
      shouldAddCallback: false,
      child: Scaffold(
        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(kToolbarHeight),
          child: Obx(
            () => Container(
              decoration: BoxDecoration(
                boxShadow: [
                  BoxShadow(
                    color: addressController.showShadow.value
                        ? Theme.of(context).appBarTheme.shadowColor!
                        : Colors.transparent,
                    spreadRadius: AppSize.height0,
                    blurRadius: AppSize.height7,
                    offset: const Offset(AppSize.height0, AppSize.height4),
                  ),
                ],
              ),
              child: Obx(
                () => AppBar(
                    scrolledUnderElevation: 0.0,
                    shadowColor: addressController.showShadow.value
                        ? Theme.of(context).appBarTheme.shadowColor
                        : Colors.transparent,
                    backgroundColor:
                        Theme.of(context).appBarTheme.backgroundColor,
                    centerTitle: false,
                    automaticallyImplyLeading: false,
                    title: Row(
                      children: [
                        GestureDetector(
                          onTap: () {
                            addressController.nameController.clear();
                            addressController.emailController.clear();
                            addressController.pinCodeController.clear();
                            addressController.stateController.clear();
                            addressController.cityController.clear();
                            addressController.houseAddressController.clear();
                            addressController.roadAreaController.clear();
                            addressController.landMarkController.clear();
                            addressController.isTap.value = false;
                            addressController.isWorkTap.value = false;
                            addressController.isOfficeTap.value = false;
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
                        Text(
                          AppString.myAddress,
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
          ),
        ),
        backgroundColor: Theme.of(context).primaryColor,
        body: SingleChildScrollView(
          controller: scrollController,
          child: Form(
            key: addressController.addressFormKey,
            child: Column(
              children: [
                const SizedBox(height: AppSize.height24),
                Padding(
                  padding: const EdgeInsets.only(
                      left: AppSize.height20, right: AppSize.height20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      useMyLocation(context),
                      const SizedBox(height: AppSize.height18),
                      nameField(),
                      const SizedBox(height: AppSize.height18),
                      emailField(),
                      const SizedBox(height: AppSize.height18),
                      pinCodeField(),
                      const SizedBox(height: AppSize.height18),
                      stateField(),
                      const SizedBox(height: AppSize.height18),
                      cityField(),
                      const SizedBox(height: AppSize.height18),
                      houseNoField(),
                      const SizedBox(height: AppSize.height18),
                      roadNameField(),
                      const SizedBox(height: AppSize.height18),
                      landmarkField(),
                      const SizedBox(height: AppSize.height18),
                      typesOfAddress(context),
                      const SizedBox(height: AppSize.height5),
                      typeOfAddressData(context),
                      const SizedBox(height: AppSize.height40),
                      saveAddressButton(context),
                      const SizedBox(height: AppSize.height30),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget useMyLocation(context) {
    return Container(
      height: AppSize.height52,
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: AppColor.placeholderColor,
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Image.asset(
            AppIcons.addressLocation,
            height: AppSize.height24,
            width: AppSize.width24,
          ),
          const SizedBox(width: AppSize.width8),
          const Text(
            AppString.useMyLocation,
            style: TextStyle(
                fontFamily: FontFamily.mulishSemiBold,
                fontSize: AppSize.height16,
                fontWeight: FontWeight.w600,
                fontStyle: FontStyle.normal,
                color: AppColor.placeholderColor),
          )
        ],
      ),
    );
  }

  Widget nameField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: addressController.nameController,
      hintText: AppString.nameHintText,
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      contentPadding: const EdgeInsets.only(
        left: AppSize.width20,
        right: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterName;
        } else {
          return null;
        }
      },
    );
  }

  Widget emailField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: addressController.emailController,
      hintText: AppString.emailIdHintText,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterEmail;
        } else {
          return null;
        }
      },
    );
  }

  Widget pinCodeField() {
    return CustomTextField(
      keyboardType: TextInputType.number,
      maxLength: AppSize.height6.toInt(),
      buildCounter: (_,
              {required int currentLength,
              required bool isFocused,
              required int? maxLength}) =>
          null,
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: addressController.pinCodeController,
      hintText: AppString.pinCode,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterPin;
        } else {
          return null;
        }
      },
    );
  }

  Widget stateField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: addressController.stateController,
      hintText: AppString.state,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterState;
        } else {
          return null;
        }
      },
    );
  }

  Widget cityField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: addressController.cityController,
      hintText: AppString.city,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterCity;
        } else {
          return null;
        }
      },
    );
  }

  Widget houseNoField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: addressController.houseAddressController,
      hintText: AppString.houseNo,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterHouseNo;
        } else {
          return null;
        }
      },
    );
  }

  Widget roadNameField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: addressController.roadAreaController,
      hintText: AppString.roadName,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterRoadName;
        } else {
          return null;
        }
      },
    );
  }

  Widget landmarkField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: addressController.landMarkController,
      hintText: AppString.landmark,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
        top: AppSize.height17,
        bottom: AppSize.height17,
      ),
      fontFamily: FontFamily.mulishMedium,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      validator: (value) {
        if (value!.isEmpty) {
          return AppString.pleaseEnterLandmark;
        } else {
          return null;
        }
      },
    );
  }

  Widget typesOfAddress(context) {
    return Text(
      AppString.typesOfAddress,
      style: TextStyle(
          fontFamily: FontFamily.mulishSemiBold,
          fontSize: AppSize.height16,
          fontWeight: FontWeight.w600,
          fontStyle: FontStyle.normal,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color),
    );
  }

  Widget saveAddressButton(context) {
    return Obx(
      () => ButtonCommon(
        onTap: () {
          if (addressController.addressFormKey.currentState!.validate()) {
            addressController.nameController.clear();
            addressController.emailController.clear();
            addressController.pinCodeController.clear();
            addressController.stateController.clear();
            addressController.cityController.clear();
            addressController.houseAddressController.clear();

            addressController.roadAreaController.clear();

            addressController.landMarkController.clear();
            addressController.isTap.value = false;
            addressController.isWorkTap.value = false;
            addressController.isOfficeTap.value = false;
            Get.back();
            Get.snackbar("Done", 'Address Saved Successfully');
          }
        },
        text: AppString.saveAddressText,
        height: AppSize.height52,
        width: AppSize.width,
        buttonColor: addressController.isValid.value
            ? AppColor.primaryColors
            : Theme.of(context).tabBarTheme.labelColor,
        borderColor: addressController.isValid.value
            ? AppColor.primaryColors
            : Theme.of(context).tabBarTheme.labelColor,
        fontFamily: FontFamily.mulishRegular,
        fontWeight: FontWeight.w600,
        fontSize: AppSize.height16,
        textColor: AppColor.whiteColor,
      ),
    );
  }

  continueButton(context) {
    return ButtonCommon(
        height: 52,
        onTap: () {
          Navigator.pop(context);
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

  Widget typeOfAddressData(context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSize.height16),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              addressController.isTap.value = true;
              addressController.isWorkTap.value = false;
              addressController.isOfficeTap.value = false;
            },
            child: Row(
              children: [
                Obx(
                  () => Container(
                    height: AppSize.height20,
                    width: AppSize.width20,
                    padding: const EdgeInsets.all(AppSize.height2),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(
                          color: addressController.isTap.value == true
                              ? Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle!
                                  .color!
                              : Theme.of(context).disabledColor,
                        )),
                    child: Container(
                      width: AppSize.width14,
                      height: AppSize.height14,
                      decoration: BoxDecoration(
                          color: addressController.isTap.value == true
                              ? Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color
                              : Theme.of(context).appBarTheme.backgroundColor,
                          borderRadius: BorderRadius.circular(30)),
                    ),
                  ),
                ),
                const SizedBox(width: AppSize.width6),
                Text(
                  AppString.home,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontSize: AppSize.height14,
                      fontWeight: FontWeight.w500,
                      fontStyle: FontStyle.normal),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSize.width40),
          GestureDetector(
            onTap: () {
              addressController.isWorkTap.value = true;
              addressController.isTap.value = false;
              addressController.isOfficeTap.value = false;
            },
            child: Row(
              children: [
                Obx(
                  () => Container(
                    height: AppSize.height20,
                    width: AppSize.width20,
                    padding: const EdgeInsets.all(AppSize.height2),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(
                          color: addressController.isWorkTap.value == true
                              ? Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle!
                                  .color!
                              : Theme.of(context).disabledColor,
                        )),
                    child: Container(
                      width: AppSize.width14,
                      height: AppSize.height14,
                      decoration: BoxDecoration(
                          color: addressController.isWorkTap.value == true
                              ? Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color
                              : Theme.of(context).appBarTheme.backgroundColor,
                          borderRadius: BorderRadius.circular(30)),
                    ),
                  ),
                ),
                const SizedBox(width: AppSize.width6),
                Text(
                  AppString.work,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontSize: AppSize.height14,
                      fontWeight: FontWeight.w500,
                      fontStyle: FontStyle.normal),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSize.width40),
          GestureDetector(
            onTap: () {
              addressController.isOfficeTap.value = true;
              addressController.isTap.value = false;
              addressController.isWorkTap.value = false;
            },
            child: Row(
              children: [
                Obx(
                  () => Container(
                    height: AppSize.height20,
                    width: AppSize.width20,
                    padding: const EdgeInsets.all(AppSize.height2),
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        border: Border.all(
                          color: addressController.isOfficeTap.value == true
                              ? Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle!
                                  .color!
                              : Theme.of(context).disabledColor,
                        )),
                    child: Container(
                      width: AppSize.width14,
                      height: AppSize.height14,
                      decoration: BoxDecoration(
                          color: addressController.isOfficeTap.value == true
                              ? Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color
                              : Theme.of(context).appBarTheme.backgroundColor,
                          borderRadius: BorderRadius.circular(30)),
                    ),
                  ),
                ),
                const SizedBox(width: AppSize.width6),
                Text(
                  AppString.office,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishSemiBold,
                      fontSize: AppSize.height14,
                      fontWeight: FontWeight.w500,
                      fontStyle: FontStyle.normal),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

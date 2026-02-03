import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/custom_widget/common_button.dart';
import 'package:home_helper_flutter_ui_kit/view/payment/payment_success_screen.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../custom_widget/custom_textfield.dart';

class CreditDebitATMCardScreen extends StatelessWidget {
  const CreditDebitATMCardScreen({super.key});

  @override
  Widget build(BuildContext context) {
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
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      width: AppSize.width24,
                      height: AppSize.height24,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                  Text(
                    AppString.creditDebitATMCard,
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
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSize.height24),
              Text(AppString.payViaNewCard,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height18)),
              const SizedBox(height: AppSize.height22),
              nameOfCardField(),
              const SizedBox(height: AppSize.height18),
              cardNumberField(),
              const SizedBox(height: AppSize.height18),
              Row(
                mainAxisAlignment: MainAxisAlignment.start,
                children: [
                  expiryField(),
                  const SizedBox(width: AppSize.height14),
                  cVVField()
                ],
              )
            ],
          ),
        ),
      ),
      floatingActionButton: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: ButtonCommon(
          text: 'Add card & pay \$200',
          buttonColor: AppColor.primaryColorLightMode,
          height: AppSize.width53,
          onTap: () {
            Get.to(PaymentSuccessScreen());
          },
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget nameOfCardField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: TextEditingController(),
      hintText: AppString.nameOnTheCard,
      hintTextWeight: FontWeight.w500,
      hintTextColor: AppColor.placeholderDarkMode,
      fontFamily: FontFamily.mulishMedium,
      hintFontSize: AppSize.height14,
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

  Widget cardNumberField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily: FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: TextEditingController(),
      hintText: AppString.cardNumber,
      hintTextWeight: FontWeight.w500,
      hintTextColor: AppColor.placeholderDarkMode,
      fontFamily: FontFamily.mulishMedium,
      hintFontSize: AppSize.height14,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20,
        left: AppSize.width20,
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

  Widget expiryField() {
    return SizedBox(
      width: 200,
      child: CustomTextField(
        fillTextColor: AppColor.secondaryColor,
        fillFontFamily: FontFamily.mulishRegular,
        fillFontSize: AppSize.height16,
        fillFontWeight: FontWeight.w500,
        controller: TextEditingController(),
        hintText: AppString.expiryMMYY,
        hintTextWeight: FontWeight.w500,
        hintTextColor: AppColor.placeholderDarkMode,
        fontFamily: FontFamily.mulishMedium,
        hintFontSize: AppSize.height14,
        fontSize: AppSize.height14,
        fontWeight: FontWeight.w500,
        color: AppColor.placeholderDarkMode,
        contentPadding: const EdgeInsets.only(
          right: AppSize.width20,
          left: AppSize.width20,
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
      ),
    );
  }

  Widget cVVField() {
    return Expanded(
      child: SizedBox(
        width: 150,
        child: CustomTextField(
          fillTextColor: AppColor.secondaryColor,
          fillFontFamily: FontFamily.mulishRegular,
          fillFontSize: AppSize.height16,
          fillFontWeight: FontWeight.w500,
          controller: TextEditingController(),
          hintText: AppString.cVV,
          hintTextWeight: FontWeight.w500,
          hintTextColor: AppColor.placeholderDarkMode,
          fontFamily: FontFamily.mulishMedium,
          hintFontSize: AppSize.height14,
          fontSize: AppSize.height14,
          fontWeight: FontWeight.w500,
          color: AppColor.placeholderDarkMode,
          contentPadding: const EdgeInsets.only(
            right: AppSize.width20,
            left: AppSize.width20,
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
        ),
      ),
    );
  }
}

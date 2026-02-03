import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/theme/themes.dart';
import 'package:home_helper_flutter_ui_kit/view/payment/payment_success_screen.dart';
import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/payment_controller.dart';
import '../../custom_widget/common_button.dart';
import '../../custom_widget/common_divider.dart';
import '../../custom_widget/custom_textfield.dart';
import 'credit_debit_card_screen.dart';

class PaymentScreen extends StatelessWidget {
  PaymentScreen({Key? key}) : super(key: key);

  final PaymentController paymentController = Get.put(PaymentController());

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
                      width: AppSize.width24,
                      height: AppSize.height24,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                  Text(
                    AppString.payment,
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
                  const Spacer(),
                  Text('\$200',
                      style: TextStyle(
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                          fontFamily: FontFamily.mulishSemiBold,
                          fontWeight: FontWeight.w600,
                          fontSize: AppSize.height16)),
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
              Text(AppString.upi,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height18)),
              const SizedBox(height: AppSize.height22),
              payViaUPIIDCard(context),
              const SizedBox(height: AppSize.height40),
              Obx(() => paymentController.currentIndex.value == 1
                  ? Text(AppString.savePaymentOptions,
                      style: TextStyle(
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                          fontFamily: FontFamily.mulishBold,
                          fontWeight: FontWeight.w700,
                          fontSize: AppSize.height18))
                  : const SizedBox()),
              Obx(
                () => paymentController.currentIndex.value == 1
                    ? const SizedBox(height: AppSize.height22)
                    : const SizedBox(),
              ),
              Obx(() => paymentController.currentIndex.value == 1
                  ? proceedCard(context)
                  : const SizedBox()),
              Obx(
                () => paymentController.currentIndex.value == 1
                    ? const SizedBox(height: AppSize.height40)
                    : const SizedBox(height: 0),
              ),
              Text(AppString.howWouldYouWant,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height18)),
              const SizedBox(height: AppSize.height22),
              Obx(() => paymentController.currentIndex.value == 1
                  ? creditNetWalletCard2(context)
                  : creditNetWalletCard(context)),
            ],
          ),
        ),
      ),
    );
  }

  payViaUPIIDCard(BuildContext context) {
    return GestureDetector(
      onTap: () {
        payViaUpiBottomSheet(context);
      },
      child: commonContainerWidget(
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              textWidget(AppString.payViaUPIID, context),
              commonArrowRightIcon(context),
            ],
          ),
          context),
    );
  }

  proceedCard(BuildContext context) {
    return commonContainerWidget(
        Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                textWidget(AppString.payViaUPIID, context),
                Obx(
                  () => GestureDetector(
                      onTap: () {
                        paymentController.isImageToggled.value =
                            !paymentController.isImageToggled.value;
                      },
                      child: Image.asset(
                          paymentController.isImageToggled.value
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
                                      ) as RegistrationStyle)
                                  .radioBuilder2)
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
                                            radioBuilder2: "",
                                            radioBuilder: "",
                                            frameBuilder: '',
                                            checkBuilder: '',
                                            checkDoneBuilder: ''),
                                      ) as RegistrationStyle)
                                  .radioBuilder),
                          height: AppSize.height18,
                          width: AppSize.height18)),
                )
              ],
            ),
            Obx(() => paymentController.isImageToggled.value
                ? const SizedBox(height: AppSize.height17)
                : const SizedBox()),
            Obx(() => paymentController.isImageToggled.value
                ? ButtonCommon(
                    onTap: () {
                      Get.to(PaymentSuccessScreen());
                    },
                    height: AppSize.height48,
                    text: AppString.proceed,
                    buttonColor: AppColor.primaryColorLightMode,
                    fontWeight: FontWeight.w600,
                    fontSize: AppSize.height16,
                    textColor: AppColor.whiteColor,
                    fontFamily: FontFamily.mulishSemiBold,
                  )
                : const SizedBox()),
          ],
        ),
        context);
  }

  creditNetWalletCard(context) {
    return commonContainerWidget(
        Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            GestureDetector(
              onTap: () {
                paymentController.currentIndex.value = 1;
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  textWidget(AppString.creditDebitATMCard, context),
                  commonArrowRightIcon(context),
                ],
              ),
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                textWidget(AppString.netBanking, context),
                commonArrowRightIcon(context),
              ],
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                textWidget(AppString.wallets, context),
                commonArrowRightIcon(context),
              ],
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                textWidget(AppString.payAfterService, context),
                commonArrowRightIcon(context),
              ],
            ),
          ],
        ),
        context);
  }

  creditNetWalletCard2(context) {
    return commonContainerWidget(
        Column(
          mainAxisAlignment: MainAxisAlignment.start,
          children: [
            GestureDetector(
              onTap: () {
                Get.to(const CreditDebitATMCardScreen());
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  textWidget(AppString.creditDebitATMCard, context),
                  commonArrowRightIcon(context),
                ],
              ),
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                textWidget(AppString.netBanking, context),
                commonArrowRightIcon(context),
              ],
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(color: Theme.of(context).dividerColor),
            const SizedBox(height: AppSize.height8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                textWidget(AppString.wallets, context),
                commonArrowRightIcon(context),
              ],
            ),
            const SizedBox(height: AppSize.height8),
            commonDivider(
              color: Theme.of(context).dividerColor,
            ),
            const SizedBox(height: AppSize.height8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                textWidget(AppString.payAfterService, context),
                commonArrowRightIcon(context),
              ],
            ),
          ],
        ),
        context);
  }

  commonArrowRightIcon(context) {
    return Image.asset(
      AppIcons.arrowRightIcon,
      height: AppSize.height20,
      width: AppSize.height20,
      color: Theme.of(context).appBarTheme.titleTextStyle?.color,
    );
  }

  textWidget(String? text, context) {
    return Text(text!,
        style: TextStyle(
            color: Theme.of(context).appBarTheme.titleTextStyle?.color,
            fontFamily: FontFamily.mulishSemiBold,
            fontWeight: FontWeight.w600,
            fontSize: AppSize.height14));
  }

  commonContainerWidget(Widget child, context) {
    return Container(
      width: Get.width,
      padding: const EdgeInsets.symmetric(
          horizontal: AppSize.height20, vertical: AppSize.height18),
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
      child: child,
    );
  }

  payViaUpiBottomSheet(BuildContext context) {
    return showModalBottomSheet(
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      shape: const OutlineInputBorder(
        borderSide: BorderSide(color: Colors.transparent),
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(12),
          topLeft: Radius.circular(12),
        ),
      ),
      context: context,
      builder: (context) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: SizedBox(
              height: 361,
              child: Column(
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
                              AppString.payViaUPIID,
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
                            AppString.verifytheVPAIdAndProceed,
                            style: TextStyle(
                              fontFamily: FontFamily.mulishMedium,
                              fontSize: AppSize.height16,
                              fontWeight: FontWeight.w500,
                              fontStyle: FontStyle.normal,
                              color: Theme.of(context)
                                  .appBarTheme
                                  .titleTextStyle
                                  ?.color,
                            ),
                          ),
                        ),
                        const SizedBox(height: AppSize.height22),
                        codeField(),
                        const SizedBox(height: AppSize.height48),
                        Stack(
                          fit: StackFit.loose,
                          children: [
                            Container(
                              height: AppSize.height72,
                              width: MediaQuery.of(context).size.width,
                              decoration: BoxDecoration(
                                color: Theme.of(context)
                                    .appBarTheme
                                    .backgroundColor,
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
                            ),
                            Padding(
                              padding: const EdgeInsets.only(
                                  left: AppSize.height20,
                                  right: AppSize.height20,
                                  top: AppSize.height10),
                              child: ButtonCommon(
                                onTap: () {
                                  Get.back();
                                  Get.to(PaymentSuccessScreen());
                                },
                                height: AppSize.height48,
                                text: AppString.saveUPi,
                                buttonColor: AppColor.primaryColorLightMode,
                                fontWeight: FontWeight.w600,
                                fontSize: AppSize.height16,
                                textColor: AppColor.whiteColor,
                                fontFamily: FontFamily.mulishSemiBold,
                              ),
                            ),
                            const SizedBox(height: AppSize.height18),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              )),
        );
      },
    );
  }

  Widget codeField() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      child: CustomTextField(
        fillTextColor: AppColor.secondaryColor,
        fillFontFamily: FontFamily.mulishRegular,
        fillFontSize: AppSize.height16,
        fillFontWeight: FontWeight.w500,
        controller: TextEditingController(),
        hintText: AppString.enterVPAID,
        hintTextWeight: FontWeight.w500,
        hintTextColor: AppColor.placeholderDarkMode,
        fontFamily: FontFamily.mulishMedium,
        hintFontSize: AppSize.height14,
        fontSize: AppSize.height14,
        fontWeight: FontWeight.w500,
        color: AppColor.placeholderDarkMode,
        contentPadding: const EdgeInsets.only(
          right:  AppSize.width20,
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
}

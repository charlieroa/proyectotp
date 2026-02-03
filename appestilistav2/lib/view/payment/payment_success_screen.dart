import 'package:flutter/material.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import 'package:home_helper_flutter_ui_kit/controller/salon_screen_controller.dart';
import 'package:home_helper_flutter_ui_kit/view/bottom_screen/bottom_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/home_screen/home_screen.dart';
import 'package:intl/intl.dart';
import 'package:get/get.dart';
import '../../config/app_color.dart';
import '../../config/app_size.dart';
import '../../config/font_family.dart';
import '../../custom_widget/common_button.dart';
import '../../theme/themes.dart';

class PaymentSuccessScreen extends StatelessWidget {
  PaymentSuccessScreen({Key? key}) : super(key: key);
  final SalonScreenController salonScreenController =
      Get.put(SalonScreenController());

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      body: Stack(children: [
        Image.asset(
          ((Theme.of(context).extensions.values.firstWhere(
                    (extension) => extension is RegistrationStyle,
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
              .frameBuilder),
          fit: BoxFit.fill,
          width: MediaQuery.of(context).size.width + 100,
          height: 80,
        ),
        Center(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(20.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Image.asset(
                    AppImage.checkMark,
                    width: 80,
                    height: 80,
                  ),
                  const SizedBox(
                    height: 37.5,
                  ),
                  const Text(
                    AppString.paymentSuccess,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: FontFamily.mulishBold,
                      fontSize: AppSize.height22,
                      fontStyle: FontStyle.normal,
                      fontWeight: FontWeight.w700,
                      color: AppColor.primaryColorLightMode,
                    ),
                  ),
                  const SizedBox(
                    height: AppSize.width20,
                  ),
                  Text(
                    AppString.paymentSuccessSummary,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: FontFamily.mulishRegular,
                      fontSize: AppSize.height14,
                      fontStyle: FontStyle.normal,
                      fontWeight: FontWeight.w500,
                      color: Theme.of(context).textTheme.titleMedium?.color,
                    ),
                  ),
                  const SizedBox(
                    height: AppSize.width30,
                  ),
                  Divider(
                    color: Theme.of(context).dividerColor,
                    thickness: 0.5,
                  ),
                  const SizedBox(
                    height: AppSize.width30,
                  ),
                  Text(
                    AppString.transactionNumber,
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: FontFamily.mulishRegular,
                      fontSize: AppSize.height14,
                      fontStyle: FontStyle.normal,
                      fontWeight: FontWeight.w500,
                      color: Theme.of(context).textTheme.titleMedium?.color,
                    ),
                  ),
                  const SizedBox(
                    height: AppSize.width40,
                  ),
                  Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          AppString.totalAmount,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: FontFamily.mulishRegular,
                            fontSize: AppSize.height14,
                            fontStyle: FontStyle.normal,
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                        Text(
                          "\$200.00",
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: FontFamily.mulishRegular,
                            fontSize: AppSize.height14,
                            fontStyle: FontStyle.normal,
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                      ]),
                  const SizedBox(
                    height: AppSize.width18,
                  ),
                  Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          AppString.paidBy,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: FontFamily.mulishRegular,
                            fontSize: AppSize.height14,
                            fontStyle: FontStyle.normal,
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                        Text(
                          AppString.gPay,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: FontFamily.mulishRegular,
                            fontSize: AppSize.height14,
                            fontStyle: FontStyle.normal,
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                      ]),
                  const SizedBox(
                    height: AppSize.width18,
                  ),
                  Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          AppString.transactionDate,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: FontFamily.mulishRegular,
                            fontSize: AppSize.height14,
                            fontStyle: FontStyle.normal,
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                        Text(
                          DateFormat('dd MMM yyyy, hh:mm aaa')
                              .format(DateTime.now())
                              .toString(),
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontFamily: FontFamily.mulishRegular,
                            fontSize: AppSize.height14,
                            fontStyle: FontStyle.normal,
                            fontWeight: FontWeight.w500,
                            color: Theme.of(context)
                                .appBarTheme
                                .titleTextStyle
                                ?.color,
                          ),
                        ),
                      ]),
                  const SizedBox(
                    height: AppSize.width18,
                  ),
                ],
              ),
            ),
          ),
        ),
      ]),
      floatingActionButton: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: ButtonCommon(
          text: AppString.continueText,
          buttonColor: AppColor.primaryColorLightMode,
          height: AppSize.width53,
          fontFamily: FontFamily.mulishBold,
          onTap: () {
            salonScreenController.value = 0.obs;
            salonScreenController.value2 = 0.obs;

            Get.offAll(const HomeScreen());
            Get.to(const BottomScreen(initialIndex: 0));
          },
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }
}

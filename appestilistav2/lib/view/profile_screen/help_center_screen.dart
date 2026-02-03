import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../custom_widget/common_divider.dart';
import '../payment/payment_screen.dart';
import 'account_screen.dart';


class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({Key? key}) : super(key: key);

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
                color:Theme.of(context).appBarTheme.shadowColor!,
                spreadRadius: AppSize.height0,
                blurRadius: AppSize.height7,
                offset: const Offset(
                    AppSize.height0, AppSize.height4),
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
                      height: AppSize.height24,color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                   Text(
                    AppString.helpCenter,
                    style: TextStyle(
                        fontFamily: FontFamily.mulishBold,
                        fontSize: AppSize.height18,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).appBarTheme.titleTextStyle?.color),
                  ),
                ],
              )),
        ),
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: Get.width,
            padding: const EdgeInsets.symmetric(horizontal:AppSize.height20,vertical: AppSize.height18),
            margin: const EdgeInsets.only(top: 24,left: AppSize.height20,right: AppSize.height20),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(AppSize.height12),
              border: Border.all(color: AppColor.boxShadowColor.withOpacity(0.1)),
              boxShadow: [
                BoxShadow(
                  color: AppColor.boxShadowColor.withOpacity(0.1),
                  spreadRadius: AppSize.height0,
                  blurRadius: AppSize.height18,
                  offset: const Offset(
                    AppSize.height0,
                    AppSize.height4,
                  ),
                ),
              ],
            ),
            child: Column(
              children: [
                GestureDetector(
                  onTap: () {
                     Navigator.push(context, MaterialPageRoute(builder: (context) => AccountScreen()));
                  },
                  child: Container(
                    width: double.infinity,
                    color: Colors.transparent,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                         Text(AppString.account,
                            style: TextStyle(
                                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                                fontFamily: FontFamily.mulishSemiBold,
                                fontWeight: FontWeight.w600,
                                fontSize: AppSize.height14)),
                        commonArrowRightIcon(context)
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSize.height12),
                commonDivider(color:Theme.of(context).dividerColor),
                const SizedBox(height: AppSize.height12),
                GestureDetector(
                  onTap: (){
                     Get.to( PaymentScreen());
                  },
                  child: Container(
                    width: double.infinity,
                    color: Colors.transparent,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                         Text(AppString.payment,
                            style: TextStyle(
                                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                                fontFamily: FontFamily.mulishSemiBold,
                                fontWeight: FontWeight.w600,
                                fontSize: AppSize.height14)),
                        commonArrowRightIcon(context)
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSize.height12),
                commonDivider(color: Theme.of(context).dividerColor),
                const SizedBox(height: AppSize.height12),
                GestureDetector(
                  onTap: (){
                    Get.to(const HelpCenterScreen());
                  },
                  child: Container(
                    width: double.infinity,
                    color: Colors.transparent,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                         Text(AppString.safety,
                            style: TextStyle(
                                color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                                fontFamily: FontFamily.mulishSemiBold,
                                fontWeight: FontWeight.w600,
                                fontSize: AppSize.height14)),
                        commonArrowRightIcon(context)
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: AppSize.height12),
                commonDivider(color: Theme.of(context).dividerColor),
                const SizedBox(height: AppSize.height12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                     Text(AppString.warranty,
                        style: TextStyle(
                            color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w600,
                            fontSize: AppSize.height14)),
                    commonArrowRightIcon(context)
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  commonArrowRightIcon(context){
    return Image.asset(
      AppIcons.arrowRightIcon,
      height: AppSize.height20,
      width: AppSize.height20,color: Theme.of(context).appBarTheme.titleTextStyle?.color,
    );
  }
}

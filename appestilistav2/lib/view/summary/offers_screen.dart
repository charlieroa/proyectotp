import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/offer_controller.dart';
import '../../custom_widget/custom_textfield.dart';


class OffersScreen extends StatelessWidget {
   OffersScreen({super.key});

 final OfferController offerController = Get.put(OfferController());

  @override
  Widget build(BuildContext context) {
    return  Scaffold(backgroundColor:Theme.of(context).primaryColor,
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
            scrolledUnderElevation: 0.0,
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
                    AppString.offers,
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
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            children: [
              const SizedBox(height: AppSize.height24),
              offerCodeCard(context),
              offerCardList(context),
            ],
          ),
        ),
      ),

    );
  }
  offerCodeCard(context){
    return Container(
      width: Get.width,
      padding: const EdgeInsets.all(AppSize.height12),
      margin: const EdgeInsets.only(bottom:AppSize.height18),
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(AppSize.height12),
        border: Border.all(color:Theme.of(context).cardTheme.shadowColor!),
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
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(AppString.offersCode,
              style:  TextStyle(
                  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  fontSize: AppSize.height16)),
          const SizedBox(height: AppSize.height17),
          codeField()

        ],
      ),
    );
  }
  Widget codeField() {
    return CustomTextField(
      fillTextColor: AppColor.secondaryColor,
      fillFontFamily:  FontFamily.mulishRegular,
      fillFontSize: AppSize.height16,
      fillFontWeight: FontWeight.w500,
      controller: TextEditingController(),
      hintText: AppString.enterCode,
      hintTextWeight: FontWeight.w500,
      hintTextColor: AppColor.placeholderDarkMode,
      fontFamily:  FontFamily.mulishMedium,
      hintFontSize: AppSize.height14,
      fontSize: AppSize.height14,
      fontWeight: FontWeight.w500,
      color: AppColor.placeholderDarkMode,
      suffixIcon:  Padding(
        padding: const EdgeInsets.all(AppSize.height20),
        child: GestureDetector(
          onTap: (){Get.back();},
          child: const Text(AppString.apply,
              style: TextStyle(
                  color: AppColor.primaryColorLightMode,
                  fontFamily: FontFamily.mulishSemiBold,
                  fontWeight: FontWeight.w600,
                  fontSize: AppSize.height12)),
        ),
      ),
      contentPadding: const EdgeInsets.only(
        right: AppSize.width20 ,
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

   offerCardList(context){
     return ListView.builder(
       itemCount: offerController.offerList.length,
         shrinkWrap: true,
         physics: const NeverScrollableScrollPhysics(),
         itemBuilder: (BuildContext contex, int indet){
         var mData = offerController.offerList[indet];
           return Container(
             width: Get.width,
             padding: const EdgeInsets.all(AppSize.height12),
             margin: const EdgeInsets.only(bottom:AppSize.height18),
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
             child: Column(
               mainAxisAlignment: MainAxisAlignment.start,
               crossAxisAlignment: CrossAxisAlignment.start,
               children: [
                 Row(
                   mainAxisAlignment: MainAxisAlignment.start,
                   children: [
                     Text(mData.title??"",
                         style:  TextStyle(
                             color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                             fontFamily: FontFamily.mulishBold,
                             fontWeight: FontWeight.w700,
                             fontSize: AppSize.height18)),
                     Text(AppString.off,
                         style:  TextStyle(
                             color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                             fontFamily: FontFamily.mulishMedium,
                             fontWeight: FontWeight.w500,
                             fontSize: AppSize.height12)),
                     const Spacer(),
                     Padding(
                       padding: const EdgeInsets.only(top: AppSize.height4),
                       child: Image.asset(AppIcons.arrowDownIcon,
                         height: AppSize.height16,
                         width: AppSize.height16,
                       color: Theme.of(context).appBarTheme.titleTextStyle?.color),
                     )
                   ],
                 ),
                 const SizedBox(height: AppSize.height12),
                  Text(mData.subTitle??'',
                     style:  TextStyle(
                         color: Theme.of(context).textTheme.titleMedium?.color,
                         fontFamily: FontFamily.mulishRegular,
                         fontWeight: FontWeight.w400,
                         fontSize: AppSize.height12)),
                 const SizedBox(height: AppSize.height4),
               ],
             ),
           );
         });


   }
}

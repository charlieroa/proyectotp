import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../custom_widget/common_button.dart';
import '../../custom_widget/custom_textfield.dart';

class EditProfileScreen extends StatelessWidget {
   EditProfileScreen({Key? key}) : super(key: key);

final TextEditingController nameController = TextEditingController();
final TextEditingController emailController = TextEditingController();
final TextEditingController mobileController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    nameController.text = AppString.henryCopper;
    emailController.text = AppString.exampleMail;
    mobileController.text =AppString. mobileNo;
    return Scaffold(
      backgroundColor:Theme.of(context).primaryColor,
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
                offset: const Offset(
                    AppSize.height0, AppSize.height4),
              ),
            ],
          ),
          child: AppBar(

              shadowColor: Theme.of(context).appBarTheme.shadowColor,
              backgroundColor:Theme.of(context).appBarTheme.backgroundColor,
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
                    AppString.editProfile,
                    style: TextStyle(
                        fontFamily: FontFamily.mulishBold,
                        fontSize: AppSize.height18,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w700,
                        color: Theme.of(context).appBarTheme.titleTextStyle?.color,),
                  ),
                ],
              )),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppSize.height24),
            CustomTextField(
              controller: nameController,),
            const SizedBox(height: AppSize.height18),
            CustomTextField(
              controller: emailController,),
            const SizedBox(height: AppSize.height18),
            CustomTextField(
              controller: mobileController),

         Expanded(
           child: Align(
             alignment: Alignment.bottomCenter,
             child: ButtonCommon(
               height: 52,
                  width: Get.width,
                  onTap: (){
                 Get.back();
                  },
                  text: AppString.updateProfile,
               buttonColor: AppColor.primaryColorDarkMode,
                ),
           ),
         ),
            const SizedBox(height: AppSize.height20),

          ],
        ),
      ),

    );
  }
}

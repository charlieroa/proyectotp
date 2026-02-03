import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/custom_widget/common_button.dart';
import 'package:home_helper_flutter_ui_kit/view/address_screen/address_screen.dart';
import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/my_address_controller.dart';

class ManageAddressScreen extends StatelessWidget {
  ManageAddressScreen({Key? key}) : super(key: key);

  final MyAddressController myAddressController =
      Get.put(MyAddressController());

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
                      height: AppSize.height24,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
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
              )
          ),
        ),
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.start,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: AppSize.height24),
                ListView.builder(
                    itemCount: myAddressController.usersName.length,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemBuilder: (BuildContext context, int index) {
                      return Obx(() => GestureDetector(
                            onTap: () {
                              myAddressController.selectedContainerIndex.value =
                                  index;
                            },
                            child: Container(
                              width: Get.width,
                              padding: const EdgeInsets.all(AppSize.height12),
                              margin: const EdgeInsets.only(
                                  bottom: AppSize.height18),
                              decoration: BoxDecoration(
                                color: Theme.of(context).cardColor,
                                borderRadius:
                                    BorderRadius.circular(AppSize.height12),
                                border: Border.all(
                                    color: index ==
                                            myAddressController
                                                .selectedContainerIndex.value
                                        ? AppColor.primaryColorDarkMode
                                        : Theme.of(context)
                                            .cardTheme
                                            .shadowColor!),
                                boxShadow: [
                                  BoxShadow(
                                    color: Theme.of(context)
                                        .cardTheme
                                        .shadowColor!,
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
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(myAddressController.usersName[index],
                                          style: TextStyle(
                                              color: Theme.of(context)
                                                  .appBarTheme
                                                  .titleTextStyle
                                                  ?.color,
                                              fontFamily:
                                                  FontFamily.mulishSemiBold,
                                              fontWeight: FontWeight.w600,
                                              fontSize: AppSize.height14)),
                                      GestureDetector(
                                          onTap: () {
                                            Get.to(const AddressScreen(
                                              edit: true,
                                            ));
                                          },
                                          child: Image.asset(AppIcons.editIcon,
                                              height: AppSize.height12,
                                              width: AppSize.height12))
                                    ],
                                  ),
                                  const SizedBox(height: AppSize.height8),
                                  Text(myAddressController.addressLists[index],
                                      style: TextStyle(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary,
                                          fontFamily: FontFamily.mulishRegular,
                                          fontWeight: FontWeight.w400,
                                          fontSize: AppSize.height12)),
                                  const SizedBox(height: AppSize.height4),
                                  Text(
                                      myAddressController
                                          .addressMobileNumbers[index],
                                      style: TextStyle(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .primary,
                                          fontFamily: FontFamily.mulishRegular,
                                          fontWeight: FontWeight.w400,
                                          fontSize: AppSize.height12)),
                                ],
                              ),
                            ),
                          ));
                    }),
                GestureDetector(
                  onTap: () {
                    Get.to(const AddressScreen(
                      edit: false,
                    ));
                  },
                  child: Container(
                    height: AppSize.height52,
                    width: double.infinity,
                    margin: const EdgeInsets.only(top: AppSize.height2),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                        color: Theme.of(context).primaryColor,
                        borderRadius: BorderRadius.circular(AppSize.height12),
                        border: Border.all(
                          color: AppColor.primaryColorDarkMode,
                          width: 1,
                        )),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Image.asset(AppIcons.addCircleIcon,
                            height: AppSize.height18, width: AppSize.height18),
                        const SizedBox(width: AppSize.height8),
                        const Text(
                          AppString.addNewAddress,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontSize: AppSize.height16,
                            color: AppColor.primaryColorLightMode,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Column(
            children: [continueButton(context)],
          )
        ],
      ),
    );
  }

  continueButton(context) {
    return Padding(
      padding: const EdgeInsets.all(20.0),
      child: ButtonCommon(
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
          fontSize: AppSize.height16),
    );
  }
}

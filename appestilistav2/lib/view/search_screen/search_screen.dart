import 'package:cupertino_will_pop_scope/cupertino_will_pop_scope.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_image.dart';
import 'package:home_helper_flutter_ui_kit/config/app_size.dart';
import 'package:home_helper_flutter_ui_kit/config/app_string.dart';
import 'package:home_helper_flutter_ui_kit/config/font_family.dart';
import 'package:home_helper_flutter_ui_kit/controller/search_screen_controller.dart';
import 'package:home_helper_flutter_ui_kit/view/address_screen/address_screen.dart';
import 'package:home_helper_flutter_ui_kit/view/map_screen/map_screen.dart';

import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../custom_widget/custom_textfield.dart';

class SearchScreen extends StatelessWidget {
  SearchScreen({Key? key}) : super(key: key);
  final SearchScreenController searchScreenController =
      Get.put(SearchScreenController());
  final ScrollController scrollController = ScrollController();

  @override
  Widget build(BuildContext context) {
     bool boolVariable=false;
    scrollController.addListener(() {

      if (scrollController.offset > 0) {
        searchScreenController.updateShowShadow(true);
      } else {
        searchScreenController.updateShowShadow(false);
      }
    });
    return ConditionalWillPopScope(
      onWillPop: () async{
        FocusManager.instance.primaryFocus?.unfocus();
        boolVariable = false;
        Navigator.pop(context, boolVariable);

        return true;
      },
      shouldAddCallback: false,
      child: Scaffold(

        appBar: PreferredSize(
          preferredSize: const Size.fromHeight(kToolbarHeight),
          child: Obx(
              ()=>Container(
              decoration: BoxDecoration(
                boxShadow: [
                  BoxShadow(
                    color: searchScreenController.showShadow.value
                        ? AppColor.appBarBoxShadowColor.withOpacity(0.10)
                        : Colors.transparent,
                    spreadRadius: AppSize.height0,
                    blurRadius: AppSize.height7,
                    offset: const Offset(
                        AppSize.height0, AppSize.height4),
                  ),
                ],
              ),
              child: Obx(
                  ()=> AppBar(

                    shadowColor: searchScreenController.showShadow.value
                        ?Theme.of(context).appBarTheme.shadowColor
                        : Colors.transparent,
                    backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
                    centerTitle: false,
                    automaticallyImplyLeading: false,
                    title: Row(
                      children: [
                        GestureDetector(
                          onTap: () {
                            FocusManager.instance.primaryFocus?.unfocus();
                            boolVariable = false;
                            Navigator.pop(context, boolVariable);


                          },
                          child: Image.asset(
                            AppImage.arrowLeft,
                            width: AppSize.width24,
                            height: AppSize.height24,color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                          ),
                        ),
                        const SizedBox(width: AppSize.height8),
                         Text(
                          AppString.selectALocation,
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
          ),
        ),
        backgroundColor: Theme.of(context).primaryColor,
        body: SingleChildScrollView(
          controller: scrollController,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.only(
                  left: AppSize.height20,
                  right: AppSize.height20,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: AppSize.height24),
                    searchField(context),
                    const SizedBox(height: AppSize.height18),
                    location(context),
                    const SizedBox(height: AppSize.height40),
                    saveAddressText(context),
                    const SizedBox(height: AppSize.height22),
                    addressOne(context),
                    const SizedBox(height: AppSize.height18),
                    addressTwo(context),
                    const SizedBox(height: AppSize.height18),
                    addressThree(context),
                    const SizedBox(height: AppSize.height18,)
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget searchField(context) {
    return CustomTextField(
      controller: searchScreenController.searchAreaController,
      hintText: AppString.searchForArea,
      contentPadding: const EdgeInsets.only(
          left: AppSize.height20,
          top: AppSize.height17,
          bottom: AppSize.height17,
          right: 1),
      fontFamily: FontFamily.mulishRegular,
      fontSize: AppSize.height14,
      fontStyle: FontStyle.normal,
      fontWeight: FontWeight.w400,
      color: AppColor.placeholderDarkMode,
      prefixIcon: Padding(
        padding: const EdgeInsets.only(
            left: AppSize.height19, right: AppSize.height11),
        child: Image.asset(
          AppIcons.searchBottomSheetIcon,
          color: Theme.of(context).appBarTheme.titleTextStyle?.color,
          width: AppSize.width20,
          height: AppSize.width20,
        ),
      ),
    );
  }
  Widget location(context){
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
                AppSize.height0, AppSize.height4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            contentPadding: const EdgeInsets.all(10),
            title: Text(
              AppString.locationPermission,
              style: TextStyle(
                fontFamily:  FontFamily.mulishSemiBold,
                fontSize: AppSize.height16,
                fontWeight: FontWeight.w600,
                fontStyle: FontStyle.normal,
                color:Theme.of(context).appBarTheme.titleTextStyle?.color,
              ),
            ),
            subtitle:  Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Text(
                AppString.enableToLocation2,
                style: TextStyle(
                  fontFamily:  FontFamily.mulishMedium,
                  fontSize: AppSize.height14,
                  fontWeight: FontWeight.w500,
                  fontStyle: FontStyle.normal,
                  color:Theme.of(context).textTheme.titleMedium?.color,
                ),
              ),
            ),
            trailing: Container(
              decoration: const BoxDecoration(

              ),
              child: GestureDetector(onTap: () {

               Get.to(MapScreen()) ;
              },
                child: Image.asset(
                  AppIcons.locationBottomSheetIcon,
                  width: AppSize.width42,
                  height: AppSize.height42,
                ),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 10.0),
            child: Container(
                height: AppSize.width1,
                width: AppSize.width324,
                color: Theme.of(context).dividerColor),
          ),    const SizedBox(height: AppSize.height10),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                GestureDetector( onTap: () {
                  Get.to(const AddressScreen(edit: false,));
                },
                  child: Row(
                    children: [
                      Image.asset(
                        AppIcons.roundAdd,
                        width: AppSize.width20,
                        height: AppSize.height20,color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                      ),     const SizedBox(width: AppSize.height10),
                       Text(
                        AppString.addAddress,
                        style: TextStyle(
                          fontFamily: FontFamily.mulishSemiBold,
                          fontSize: AppSize.height14,
                          fontWeight: FontWeight.w600,
                          fontStyle: FontStyle.normal,
                          color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                        ),
                      ),
                    ],
                  ),
                ),


                Image.asset(
                  AppIcons.arrowForward,
                  width: AppSize.width18,
                  height: AppSize.height18,  color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                ),

              ],
            ),

          ),
          const SizedBox(height: 10,)
        ],
      ),
    );
  }


  Widget saveAddressText(context) {
    return  Text(
      AppString.saveAddress,
      style: TextStyle(
        fontFamily:FontFamily. mulishBold,
        fontSize: AppSize.height18,
        fontWeight: FontWeight.w700,
        fontStyle: FontStyle.normal,
    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
      ),
    );
  }

  Widget addressOne(context) {
    return Container(
      width: AppSize.width,
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color:  Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
                AppSize.height0, AppSize.height4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.only(
          top: AppSize.height12,
          bottom: AppSize.height12,
          left: AppSize.height12,
          right: AppSize.height12,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                 Text(
                  AppString.home,
                  style: TextStyle(
                    fontFamily: FontFamily.mulishSemiBold,
                    fontSize: AppSize.height14,
                    fontWeight: FontWeight.w600,
                    fontStyle: FontStyle.normal,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  ),
                ),
                const Spacer(),
                GestureDetector(onTap: () {
                  Get.to(const AddressScreen(edit: true));
                },
                  child: Image.asset(AppIcons.editIcon,
                      height: AppSize.height12, width: AppSize.width12),
                ),
              ],
            ),
            const SizedBox(height: AppSize.height4),
             Text(
              AppString.addressWashington,
              style: TextStyle(
                fontFamily:FontFamily. mulishMedium,
                fontSize: AppSize.height12,
                fontWeight: FontWeight.w500,
                fontStyle: FontStyle.normal,
                color: Theme.of(context).textTheme.titleMedium?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget addressTwo(context) {
    return Container(
      decoration: BoxDecoration(
        color:Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
                AppSize.height0, AppSize.height4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.only(
          top: AppSize.height12,
          bottom: AppSize.height11,
          left: AppSize.height12,
          right: AppSize.height12,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                 Text(
                  AppString.office,
                  style: TextStyle(
                    fontFamily: FontFamily.mulishSemiBold,
                    fontSize: AppSize.height14,
                    fontWeight: FontWeight.w600,
                    fontStyle: FontStyle.normal,
                    color:Theme.of(context).appBarTheme.titleTextStyle?.color,
                  ),
                ),
                const Spacer(),
                GestureDetector(onTap: () {
                  Get.to(const AddressScreen(edit: true));
                },
                  child: Image.asset(AppIcons.editIcon,
                      height: AppSize.height12, width: AppSize.width12),
                ),
              ],
            ),
            const SizedBox(height: AppSize.height4),
             Text(
              AppString.addressSyracuse,
              style: TextStyle(
                fontFamily: FontFamily.mulishMedium,
                fontSize: AppSize.height12,
                fontWeight: FontWeight.w500,
                fontStyle: FontStyle.normal,
                color: Theme.of(context).textTheme.titleMedium?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget addressThree(context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color:  Theme.of(context).cardTheme.shadowColor!,
            spreadRadius: AppSize.height0,
            blurRadius: AppSize.height18,
            offset: const Offset(
                AppSize.height0, AppSize.height4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.only(
          top: AppSize.height12,
          bottom: AppSize.height11,
          left: AppSize.height12,
          right: AppSize.height12,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                 Text(
                  AppString.office,
                  style: TextStyle(
                    fontFamily: FontFamily.mulishSemiBold,
                    fontSize: AppSize.height14,
                    fontWeight: FontWeight.w600,
                    fontStyle: FontStyle.normal,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                  ),
                ),
                const Spacer(),
                GestureDetector(onTap: () {
                  Get.to(const AddressScreen(edit: true));
                },
                  child: Image.asset(AppIcons.editIcon,
                      height: AppSize.height12, width: AppSize.width12),
                ),
              ],
            ),
            const SizedBox(height: AppSize.height4),
             Text(
              AppString.addressRanchview,
              style: TextStyle(
                fontFamily: FontFamily.mulishMedium,
                fontSize: AppSize.height12,
                fontWeight: FontWeight.w500,
                fontStyle: FontStyle.normal,
                color: Theme.of(context).textTheme.titleMedium?.color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

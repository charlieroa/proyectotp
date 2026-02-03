import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:home_helper_flutter_ui_kit/controller/map_screen_controller.dart';

import '../../config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../custom_widget/common_button.dart';
import '../../custom_widget/custom_textfield.dart';

class MapScreen extends StatelessWidget {
  MapScreen({Key? key}) : super(key: key);
  final MapScreenController mapScreenController = Get.put(MapScreenController());
  final ScrollController scrollController = ScrollController();
  final Completer<GoogleMapController> _controller = Completer();

  static const LatLng _center = LatLng(19.018255973653343, 72.84793849278007);

  void _onMapCreated(GoogleMapController controller) {
    _controller.complete(controller);
  }

  @override
  Widget build(BuildContext context) {
    EdgeInsets viewInsets = MediaQuery.of(context).viewInsets;

    scrollController.addListener(() {

      if (scrollController.offset > 0) {
        mapScreenController.updateShowShadow(true);
      } else {
        mapScreenController.updateShowShadow(false);
      }
    });
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Obx(
          () => Container(
            decoration: BoxDecoration(
              boxShadow: [
                BoxShadow(
                  color: mapScreenController.showShadow.value
                      ? Theme.of(context).appBarTheme.shadowColor!
                      : Colors.transparent,
                  spreadRadius: AppSize.height0,
                  blurRadius: AppSize.height7,
                  offset: const Offset(
                      AppSize.height0, AppSize.height4),
                ),
              ],
            ),
            child: Obx(
              () => AppBar(
                shadowColor: mapScreenController.showShadow.value
                    ? Theme.of(context).appBarTheme.shadowColor
                    : Colors.transparent,
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
                        height: AppSize.height24,color:  Theme.of(context).appBarTheme.titleTextStyle?.color,
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
                        color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
      body: Stack(
        children: [
          GoogleMap(
            zoomControlsEnabled: false,
            mapType: MapType.normal,
            onMapCreated: _onMapCreated,
            onTap: (argument) {
              _center;
            },
            initialCameraPosition: const CameraPosition(
              target: _center,
              zoom: 11.0,
            ),
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: searchField(context),
          ),
          Positioned(
            bottom: viewInsets.bottom > 0 ? -1000 : 0,
            left: 0,
            right: 0,
            child: Column(
              children: [
                useCurrentLocation(context),
                const SizedBox(
                  height: AppSize.height10,
                ),
                const SizedBox(height: AppSize.height18),
                multiSpecialtyHospitalData(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget searchField(context) {
    return Padding(
      padding: const EdgeInsets.only(
          left: AppSize.height20,
          right: AppSize.width20,
          top: AppSize.height24),
      child: Container(
        decoration: BoxDecoration(
            color:Theme.of(context).primaryColor,
            borderRadius: BorderRadius.circular(12)),
        child: CustomTextField(
          controller: mapScreenController.searchController,
          hintText: AppString.searchForArea,
           fillColor:Theme.of(context).primaryColor,
          contentPadding: const EdgeInsets.only(
              left: AppSize.height19,
              top: AppSize.height17,
              bottom: AppSize.height17,
              right: 1),
          fontFamily: FontFamily.mulishRegular,
          fontSize: AppSize.height14,
          fontStyle: FontStyle.normal,
          fontWeight: FontWeight.w400,
          onTap: () {

          },
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
        ),
      ),
    );
  }

  Widget useCurrentLocation(context) {
    return Container(
      width: AppSize.width186,
      height: AppSize.height36,
      decoration: BoxDecoration(
          color: Theme.of(context).primaryColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: Theme.of(context).colorScheme.secondary,
          )),
      child: Row(
        children: [
          const SizedBox(width: AppSize.height12),
          Image.asset(
            AppIcons.useLocationIcon,
            width: AppSize.width18,
            height: AppSize.height18,color: Theme.of(context).appBarTheme.titleTextStyle?.color ,
          ),
          const SizedBox(width: AppSize.height12),
           Text(
            AppString.useCurrentLocation,
            textAlign: TextAlign.center,
            style: TextStyle(
                fontSize: AppSize.height14,
                fontStyle: FontStyle.normal,
                fontFamily: FontFamily.mulishSemiBold,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).appBarTheme.titleTextStyle?.color),
          ),
        ],
      ),
    );
  }

  Widget multiSpecialtyHospitalData(context) {
    return ClipRRect(
      borderRadius: const BorderRadius.only(
        topRight: Radius.circular(AppSize.height12),
        topLeft: Radius.circular(AppSize.height12),
      ),
      child: Container(
        height: AppSize.height155,
        decoration: BoxDecoration(
          color:Theme.of(context).primaryColor,
          boxShadow: [
            BoxShadow(
              color: AppColor.primaryColorDarkMode
                  .withOpacity(0.1),
              spreadRadius: AppSize.height0,
              blurRadius: AppSize.height18,
              offset: const Offset(
                AppSize.height0,
                AppSize.height4,
              ),
            ),
          ],
          borderRadius: const BorderRadius.only(
            topRight: Radius.circular(AppSize.height12),
            topLeft: Radius.circular(AppSize.height12),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.only(
            left: AppSize.height20,
            right: AppSize.height20,
            top: AppSize.height20,
          ),
          child: Column(
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: AppSize.height5),
                    child: Image.asset(
                      AppIcons.mapIcon,
                      height: AppSize.height28,
                      width: AppSize.width28,
                    ),
                  ),
                  const SizedBox(width: AppSize.width12),
                   Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppString.multiSpecialtyHospital,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: AppSize.height16,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context).appBarTheme.titleTextStyle?.color),
                      ),
                      const SizedBox(height: AppSize.height6),
                      Text(
                        AppString.addressRanchviewDr,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: AppSize.height12,
                            fontStyle: FontStyle.normal,
                            fontFamily: FontFamily.mulishSemiBold,
                            fontWeight: FontWeight.w500,
                            color:  Theme.of(context).colorScheme.primary),
                      ),
                    ],
                  ),
                ],
              ),
              confirmLocationButton(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget confirmLocationButton(context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSize.height22),
      child: ButtonCommon(
          onTap: () {
         Navigator.pop(context);
          },
          text: AppString.confirmLocation,
          height: AppSize.height52,
          width: AppSize.width,
          buttonColor: AppColor.primaryColorLightMode,
          borderColor: AppColor.primaryColorLightMode,
          fontFamily: FontFamily.mulishRegular,
          fontWeight: FontWeight.w600,
          fontSize: AppSize.height16,
          textColor: AppColor.whiteColor),
    );
  }
}

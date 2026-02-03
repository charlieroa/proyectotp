import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/notification_controller.dart';

import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';

class NotificationScreen extends StatelessWidget {
  NotificationScreen({Key? key}) : super(key: key);
  final NotificationController notificationController =
      Get.put(NotificationController());
  final ScrollController scrollController = ScrollController();
  @override
  Widget build(BuildContext context) {
    scrollController.addListener(() {
      if (scrollController.offset > 0) {
        notificationController.updateShowShadow(true);
      } else {
        notificationController.updateShowShadow(false);
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
                  color: notificationController.showShadow.value
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
                  shadowColor: notificationController.showShadow.value
                      ? Theme.of(context).appBarTheme.shadowColor!
                      : Colors.transparent,
                  backgroundColor:
                      Theme.of(context).appBarTheme.backgroundColor,
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
                          color: Theme.of(context)
                              .appBarTheme
                              .titleTextStyle
                              ?.color,
                        ),
                      ),
                      const SizedBox(width: AppSize.height8),
                      Text(
                        AppString.notifications,
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
      body: notifications(),
    );
  }

  Widget notifications() {
    return ListView.separated(
      controller: scrollController,
      itemCount: 5,
      padding: const EdgeInsets.only(top: AppSize.height10),
      itemBuilder: (context, index) {
        return Padding(
          padding: const EdgeInsets.only(
            top: AppSize.height10,
            left: AppSize.height20,
            right: AppSize.height20,
            bottom: AppSize.height18,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    notificationController.notificationTitle[index],
                    style: TextStyle(
                        fontSize: AppSize.height16,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w600,
                        fontFamily: FontFamily.mulishSemiBold,
                        color: Theme.of(context)
                            .appBarTheme
                            .titleTextStyle
                            ?.color),
                  ),
                  const Spacer(),
                  if (index >= 0 && index <= 2)
                    Container(
                      width: AppSize.height5,
                      height: AppSize.height5,
                      decoration: const BoxDecoration(
                        color: AppColor.boxShadowColor,
                        shape: BoxShape.circle,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: AppSize.height6),
              Text(
                notificationController.notificationDescription[index],
                style: TextStyle(
                    fontSize: AppSize.height14,
                    fontStyle: FontStyle.normal,
                    fontWeight: FontWeight.w400,
                    fontFamily: FontFamily.mulishRegular,
                    color: Theme.of(context).textTheme.titleMedium?.color),
              ),
              const SizedBox(height: AppSize.height6),
              Row(
                children: [
                  Text(
                    notificationController.notificationDay[index],
                    style: TextStyle(
                        fontSize: AppSize.height12,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w500,
                        fontFamily: FontFamily.mulishRegular,
                        color: Theme.of(context).textTheme.titleMedium?.color),
                  ),
                  const SizedBox(width: AppSize.width8),
                  Container(
                    color: Theme.of(context).dividerColor,
                    width: 1,
                    height: 10,
                  ),
                  const SizedBox(width: AppSize.width8),
                  Text(
                    notificationController.notificationTime[index],
                    style: TextStyle(
                        fontSize: AppSize.height12,
                        fontStyle: FontStyle.normal,
                        fontWeight: FontWeight.w500,
                        fontFamily: FontFamily.mulishRegular,
                        color: Theme.of(context).textTheme.titleMedium?.color),
                  ),
                ],
              )
            ],
          ),
        );
      },
      separatorBuilder: (context, index) {
        return Divider(
          color: Theme.of(context).dividerColor,
          thickness: 0.8,
        );
      },
    );
  }
}

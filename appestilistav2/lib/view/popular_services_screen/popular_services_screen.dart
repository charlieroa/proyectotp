import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/controller/popular_services_controller.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../view_detail_screen/view_detail_screen.dart';

class PopularServicesScreen extends StatelessWidget {
  PopularServicesScreen({Key? key}) : super(key: key);
  final PopularServicesController popularServicesController =
      Get.put(PopularServicesController());
  final ScrollController scrollController = ScrollController();

  @override
  Widget build(BuildContext context) {
    scrollController.addListener(() {
      if (scrollController.offset > 0) {
        popularServicesController.updateShowShadow(true);
      } else {
        popularServicesController.updateShowShadow(false);
      }
    });
    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: popularServicesController.showShadow.value
                    ? Theme.of(context).appBarTheme.shadowColor!
                    : Colors.transparent,
                spreadRadius: AppSize.height0,
                blurRadius: AppSize.height7,
                offset: const Offset(
                  AppSize.height0,
                  AppSize.height4,
                ),
              ),
            ],
          ),
          child: Obx(
            () => AppBar(
              scrolledUnderElevation: 0.0,
              shadowColor: popularServicesController.showShadow.value
                  ? Theme.of(context).appBarTheme.shadowColor!
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
                      height: AppSize.height24,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                  Text(
                    AppString.popularServices,
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
              ),
            ),
          ),
        ),
      ),
      body: popularServiceData(),
    );
  }

  Widget popularServiceData() {
    return GridView.builder(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 0.75,
          mainAxisSpacing: 18,
          crossAxisSpacing: 20),
      shrinkWrap: true,
      padding: const EdgeInsets.all(AppSize.height20),
      controller: scrollController,
      clipBehavior: Clip.none,
      scrollDirection: Axis.vertical,
      itemCount: popularServicesController.popularServiceImageList.length,
      itemBuilder: (context, index) {
        return Stack(
          children: [
            GestureDetector(
              onTap: () {
                if (index == 1) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ViewDetailScreen(),
                    ),
                  );
                }
              },
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  color: Theme.of(context).cardColor,
                  boxShadow: [
                    BoxShadow(
                      color: Theme.of(context).cardTheme.shadowColor!,
                      spreadRadius: AppSize.height0,
                      blurRadius: AppSize.height9,
                      offset: const Offset(
                        AppSize.height0,
                        AppSize.height4,
                      ),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                            image: DecorationImage(
                                image: AssetImage(
                                  popularServicesController
                                      .popularServiceImageList[index],
                                ),
                                fit: BoxFit.fill),
                            borderRadius: const BorderRadius.only(
                                topRight: Radius.circular(12),
                                topLeft: Radius.circular(12))),
                      ),
                    ),
                    Container(
                      height: 95,
                      decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: const BorderRadius.only(
                              bottomLeft: Radius.circular(12),
                              bottomRight: Radius.circular(12))),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Padding(
                            padding: const EdgeInsets.only(
                                right: AppSize.height12,
                                left: AppSize.height12,
                                top: AppSize.height12),
                            child: Text(
                              popularServicesController
                                  .popularServiceStringList[index],
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  fontSize: AppSize.height14,
                                  fontStyle: FontStyle.normal,
                                  fontFamily: FontFamily.mulishSemiBold,
                                  fontWeight: FontWeight.w600,
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.only(
                                right: AppSize.height12,
                                left: AppSize.height12,
                                top: AppSize.height4),
                            child: Row(
                              children: [
                                Image.asset(
                                  AppImage.starIcon,
                                  width: AppSize.height12,
                                  color: Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color,
                                ),
                                const SizedBox(width: AppSize.width3),
                                Text(
                                  popularServicesController
                                      .popularServiceStringRateList[index],
                                  style: TextStyle(
                                    color: Theme.of(context)
                                        .appBarTheme
                                        .titleTextStyle
                                        ?.color,
                                    fontSize: AppSize.height12,
                                    fontWeight: FontWeight.w600,
                                    fontStyle: FontStyle.normal,
                                    fontFamily: FontFamily.mulishSemiBold,
                                  ),
                                ),
                                const SizedBox(
                                  width: 6,
                                ),
                                Text(
                                  popularServicesController
                                      .popularServiceStringReviewsList[index],
                                  style: TextStyle(
                                    color: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.color,
                                    fontSize: AppSize.height12,
                                    fontWeight: FontWeight.w400,
                                    fontFamily: FontFamily.mulishRegular,
                                    fontStyle: FontStyle.normal,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSize.height8),
                          Padding(
                            padding: const EdgeInsets.only(
                              left: AppSize.height12,
                              right: AppSize.height12,
                            ),
                            child: Row(
                              children: [
                                Text(
                                  popularServicesController.price[index],
                                  style: TextStyle(
                                    color: Theme.of(context)
                                        .appBarTheme
                                        .titleTextStyle
                                        ?.color,
                                    fontStyle: FontStyle.normal,
                                    fontFamily: FontFamily.mulishBold,
                                    fontWeight: FontWeight.w700,
                                    fontSize: AppSize.height14,
                                  ),
                                ),
                                Text(
                                  popularServicesController.price2[index],
                                  style: TextStyle(
                                    decoration: TextDecoration.lineThrough,
                                    color: Theme.of(context)
                                        .textTheme
                                        .titleMedium
                                        ?.color,
                                    fontStyle: FontStyle.normal,
                                    fontFamily: FontFamily.mulishRegular,
                                    fontWeight: FontWeight.w400,
                                    fontSize: AppSize.height12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: AppSize.height14),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

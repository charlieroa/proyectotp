import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/config/app_icons.dart';
import '../../config/app_color.dart';
import '../../config/app_image.dart';
import '../../config/app_size.dart';
import '../../config/app_string.dart';
import '../../config/font_family.dart';
import '../../controller/dark_controller.dart';
import '../../controller/slot_controller.dart';
import '../../custom_widget/common_button.dart';
import '../summary/summary_screen.dart';

class SlotScreen extends StatefulWidget {
  const SlotScreen({super.key});

  @override
  State<SlotScreen> createState() => _SlotScreenState();
}

class _SlotScreenState extends State<SlotScreen> {
  final SlotController slotController = Get.put(SlotController());
  final ScrollController scrollController = ScrollController();
  DarkModeController darkModeController = Get.put(DarkModeController());

  DateTime selectedDate = DateTime.now();
  DateTime currentDate = DateTime.now();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      scrollToToday();
    });
  }

  @override
  Widget build(BuildContext context) {
    final daysInMonth =
        DateTime(currentDate.year, currentDate.month + 1, 0).day;
    final dayLabels = [
      AppString.mon,
      AppString.tue,
      AppString.wed,
      AppString.thu,
      AppString.fri,
      AppString.sat,
      AppString.sun
    ];
    final today = DateTime.now().toLocal();
    final currentMonth = DateTime(currentDate.year, currentDate.month);

    return Scaffold(
      backgroundColor: Theme.of(context).primaryColor,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(kToolbarHeight),
        child: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: AppColor.appBarBoxShadowColor.withOpacity(0.10),
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
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      width: AppSize.width24,
                      height: AppSize.height24,
                    ),
                  ),
                  const SizedBox(width: AppSize.height8),
                  Text(
                    AppString.slot,
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
      body: SingleChildScrollView(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.start,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: AppSize.height20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
              child: Text(AppString.whenShouldTheProfessional,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height18)),
            ),
            const SizedBox(height: AppSize.height6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
              child: Text(AppString.yourServiceWillTakeApprox,
                  style: TextStyle(
                      color: Theme.of(context).textTheme.titleMedium?.color,
                      fontFamily: FontFamily.mulishMedium,
                      fontWeight: FontWeight.w500,
                      fontSize: AppSize.height14)),
            ),
            const SizedBox(height: AppSize.height18),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.start,
                children: [
                  Text(
                    _getMonthName(currentDate.month),
                    style: TextStyle(
                      fontFamily: FontFamily.mulishSemiBold,
                      fontWeight: FontWeight.w600,
                      fontSize: AppSize.height16,
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                    ),
                  ),
                  const SizedBox(width: AppSize.height5),
                  Image.asset(
                    AppIcons.arrowDownIcon,
                    color: Theme.of(context).appBarTheme.titleTextStyle?.color,
                    height: AppSize.height12,
                    width: AppSize.height12,
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSize.height16),
            SizedBox(
              height: 60.0,
              child: ListView.builder(
                controller: scrollController,
                shrinkWrap: true,
                scrollDirection: Axis.horizontal,
                itemCount: daysInMonth,
                padding:
                    const EdgeInsets.symmetric(horizontal: AppSize.height14),
                itemBuilder: (context, index) {
                  final date =
                      DateTime(currentDate.year, currentDate.month, index + 1);
                  bool isDatePrevoius = date.day < currentDate.day;
                  String dayLabel = dayLabels[date.weekday - 1];
                  String formattedDate = date.day.toString().padLeft(2, '0');
                  bool isToday = date.day == today.day &&
                      currentMonth.month == today.month;
                  bool isSelected = date.day == selectedDate.day &&
                      currentMonth.month == selectedDate.month;
                  Color? textColor = isSelected || !isDatePrevoius
                      ? Theme.of(context).appBarTheme.titleTextStyle!.color!
                      : isToday
                          ? Theme.of(context).textTheme.titleMedium?.color
                          : darkModeController.isLightTheme.value
                              ? Theme.of(context).textTheme.titleMedium?.color
                              : Theme.of(context).textTheme.titleMedium?.color;

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        selectedDate = date;
                      });
                    },
                    child: Container(
                      width: 60.0,
                      margin: const EdgeInsets.only(
                          left: 6, right: AppSize.height6),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          color: isSelected
                              ? Theme.of(context).appBarTheme.foregroundColor
                              : Theme.of(context).primaryColor,
                          border: Border.all(
                              color: isSelected
                                  ? AppColor.primaryColorDarkMode
                                  : Theme.of(context).colorScheme.tertiary)),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            dayLabel,
                            style: TextStyle(
                                fontFamily: FontFamily.mulishSemiBold,
                                fontWeight: FontWeight.w600,
                                fontSize: AppSize.height14,
                                color: textColor),
                          ),
                          const SizedBox(
                            height: AppSize.height6,
                          ),
                          Text(
                            formattedDate,
                            style: TextStyle(
                              fontFamily: FontFamily.mulishSemiBold,
                              fontWeight: FontWeight.w600,
                              fontSize: AppSize.height14,
                              color: textColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: AppSize.height18),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
              child: Text(AppString.selectStartTimeOfService,
                  style: TextStyle(
                      color:
                          Theme.of(context).appBarTheme.titleTextStyle?.color,
                      fontFamily: FontFamily.mulishBold,
                      fontWeight: FontWeight.w700,
                      fontSize: AppSize.height18)),
            ),
            const SizedBox(height: AppSize.height22),
            buildSelectedTimeList(),
            const SizedBox(height: AppSize.height40),
          ],
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
      floatingActionButton: proceedToCheckoutButton(),
    );
  }

  void scrollToToday() {
    int daysInMonth = DateTime(currentDate.year, currentDate.month + 1, 0).day;
    DateTime today = DateTime.now().toLocal();

    int todayIndex = today.day - 1;
    if (todayIndex >= 0 && todayIndex < daysInMonth) {
      double scrollTo = todayIndex * (Get.width * 0.186);
      scrollController.jumpTo(scrollTo);
    }
  }

  buildSelectedTimeList() {
    return GridView.builder(
        itemCount: slotController.timeList.length,
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: AppSize.height12,
            mainAxisExtent: AppSize.height48,
            crossAxisSpacing: AppSize.height12),
        itemBuilder: (BuildContext context, int index) {
          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Obx(
                () => Expanded(
                  child: GestureDetector(
                    onTap: () {
                      slotController.selectedTimeIndex.value = index;
                    },
                    child: Container(
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                          color: slotController.selectedTimeIndex.value == index
                              ? Theme.of(context).appBarTheme.foregroundColor
                              : Theme.of(context).primaryColor,
                          borderRadius: BorderRadius.circular(AppSize.height12),
                          border: Border.all(
                              color: slotController.selectedTimeIndex.value ==
                                      index
                                  ? AppColor.primaryColorDarkMode
                                  : Theme.of(context).colorScheme.tertiary)),
                      child: Text(
                          slotController.timeList[index].time.toString(),
                          style: TextStyle(
                              color: slotController.selectedTimeIndex.value ==
                                      index
                                  ? Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color
                                  : Theme.of(context)
                                      .appBarTheme
                                      .titleTextStyle
                                      ?.color,
                              fontFamily:
                                  slotController.selectedTimeIndex.value ==
                                          index
                                      ? FontFamily.mulishMedium
                                      : FontFamily.mulishRegular,
                              fontWeight:
                                  slotController.selectedTimeIndex.value ==
                                          index
                                      ? FontWeight.w500
                                      : FontWeight.w400,
                              fontSize: AppSize.height14)),
                    ),
                  ),
                ),
              ),
            ],
          );
        });
  }

  String _getMonthName(int month) {
    switch (month) {
      case 1:
        return AppString.january;
      case 2:
        return AppString.february;
      case 3:
        return AppString.march;
      case 4:
        return AppString.april;
      case 5:
        return AppString.may;
      case 6:
        return AppString.june;
      case 7:
        return AppString.july;
      case 8:
        return AppString.august;
      case 9:
        return AppString.september;
      case 10:
        return AppString.october;
      case 11:
        return AppString.november;
      case 12:
        return AppString.december;
      default:
        return "";
    }
  }

  proceedToCheckoutButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSize.height20),
      child: ButtonCommon(
          height: 52,
          onTap: () {
            Get.to(SummaryScreen());
          },
          width: double.infinity,
          borderColor: AppColor.primaryColorLightMode,
          buttonColor: AppColor.primaryColorLightMode,
          text: AppString.proceedToCheckout,
          fontFamily: FontFamily.mulishSemiBold,
          fontWeight: FontWeight.w600,
          textColor: AppColor.whiteColor,
          fontSize: AppSize.height16),
    );
  }
}

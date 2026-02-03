import 'package:flutkit/full_apps/m3/learning/views/lecture_timetable_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class NavItem {
  final String title;
  final IconData activeIconData, inactiveIconData;

  NavItem(this.title, this.activeIconData, this.inactiveIconData);
}

class FullAppController extends GetxController {
  int currentIndex = 0;
  int pages = 4;
  late TabController tabController;

  final TickerProvider tickerProvider;

  late List<NavItem> navItems;

  FullAppController(this.tickerProvider) {
    tabController =
        TabController(length: pages, vsync: tickerProvider, initialIndex: 0);
    navItems = [
      NavItem('Home', LucideIcons.house, LucideIcons.house),
      NavItem('Explore', LucideIcons.book_open, LucideIcons.book_open),
      NavItem('Chat', LucideIcons.messages_square, LucideIcons.messages_square),
      NavItem('Profile', LucideIcons.user, LucideIcons.user),
    ];
  }

  @override
  void onInit() {
    super.onInit();
    tabController.addListener(handleTabSelection);
    tabController.animation!.addListener(() {
      final aniValue = tabController.animation!.value;
      if (aniValue - currentIndex > 0.5) {
        currentIndex++;
        update();
      } else if (aniValue - currentIndex < -0.5) {
        currentIndex--;
        update();
      }
    });
  }

  void changePage(int index) {
    tabController.animateTo(index);
  }

  void goToSetting() {
    changePage(3);
  }

  void goToTimeTable() {
    Get.to(LectureTimeTableScreen());
    // Navigator.of(context, rootNavigator: true).push(
    //     MaterialPageRoute(builder: (context) => LectureTimeTableScreen()));
  }

  void handleTabSelection() {
    currentIndex = tabController.index;
    update();
  }
}

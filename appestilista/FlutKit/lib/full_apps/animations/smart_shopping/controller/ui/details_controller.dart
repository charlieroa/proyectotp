import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';

class DetailsController extends GetxController {
  final PageController pageController = PageController();
  int currentPage = 0;
  Timer? autoSlideTimer;
  bool isLike = false;
  int isSelectSize = 0;

  final List<String> imagePaths = [
    'assets/images/apps/shopping2/images/photo1.jpg',
    'assets/images/apps/shopping2/images/photo2.jpg',
    'assets/images/apps/shopping2/images/photo3.jpg',
    'assets/images/apps/shopping2/images/photo4.jpg',
  ];

  @override
  void onInit() {
    pageController.addListener(() {
      int newPage = pageController.page?.round() ?? 0;
      if (currentPage != newPage) {
        currentPage = newPage;
        update();
      }
    });

    autoSlideTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      int nextPage = (currentPage + 1) % imagePaths.length;
      pageController.animateToPage(nextPage, duration: const Duration(milliseconds: 500), curve: Curves.easeInOut);
    });
    super.onInit();
  }

  @override
  void dispose() {
    pageController.dispose();
    autoSlideTimer?.cancel();
    super.dispose();
  }

  void onToggleLike() {
    isLike = !isLike;
    update();
  }

  void onToggleSelectSize(int index) {
    isSelectSize = index;
    update();
  }
}

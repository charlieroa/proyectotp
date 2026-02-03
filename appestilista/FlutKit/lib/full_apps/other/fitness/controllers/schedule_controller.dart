import 'package:flutkit/full_apps/other/fitness/models/schedule_exercise.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class ScheduleController extends GetxController {
  bool showLoading = true, uiLoading = true;
  ScheduleExercise? exerciseSelected;
  List<ScheduleExercise>? dailyExercises;
  PageController pageController = PageController(initialPage: 0);
  int currentPage = 0;
  int numPages = 7;

  late DateTime selectedDate;

  @override
  void onInit() {
    selectedDate = DateTime.now();
    fetchData();
    super.onInit();
  }

  void fetchData() async {
    dailyExercises = await ScheduleExercise.getDummyList();
    exerciseSelected = dailyExercises!.first;
    await Future.delayed(Duration(seconds: 1));
    showLoading = false;
    uiLoading = false;
    update();
  }

  void selectDate(ScheduleExercise exercise) {
    exerciseSelected = exercise;
    update();
  }

  void goBack() {
    Get.back();
    // Navigator.pop(context);
  }

  Future<void> nextPage() async {
    if (currentPage == numPages) {
      /*   Navigator.push(
          context, MaterialPageRoute(builder: (context) => FullApp()));*/
    } else {
      await pageController.animateToPage(
        currentPage + 1,
        duration: Duration(milliseconds: 600),
        curve: Curves.ease,
      );
    }
  }

  Future<void> showCalendar() async {
    final DateTime? picked = await showDatePicker(
        context: Get.context!,
        initialDate: selectedDate,
        firstDate: DateTime(2015, 8),
        lastDate: DateTime(2101));
    if (picked != null && picked != selectedDate) {
      selectedDate = picked;
      update();
    }
  }

  void previousPage() async {
    if (currentPage == 0) {
      /*   Navigator.push(
          context, MaterialPageRoute(builder: (context) => FullApp()));*/
    } else {
      await pageController.animateToPage(
        currentPage - 1,
        duration: Duration(milliseconds: 600),
        curve: Curves.ease,
      );
    }
  }

  Future<void> onPageChanged(int page, {bool fromUser = false}) async {
    if (!fromUser) currentPage = page;
    update();
    if (fromUser) {
      await pageController.animateToPage(
        page,
        duration: Duration(milliseconds: 600),
        curve: Curves.ease,
      );
    }
  }
}

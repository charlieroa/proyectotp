import 'package:flutkit/full_apps/animations/hr/model/hire_data.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class HireCandidateController extends GetxController {
  List<HireDataModel> searchList = [];
  List<HireDataModel> hireList = [];
  TextEditingController searchController = TextEditingController();

  void searchHireList(String query) {
    searchList = hireList.where((hire) {
      final skill = hire.skill.toLowerCase();
      final input = query.toLowerCase();
      return skill.contains(input);
    }).toList();
    update();
  }

  @override
  void onInit() {
    HireDataModel.getDummyList().then((value) {
      hireList = value;
      searchList = value;
      update();
    });
    super.onInit();
  }
}

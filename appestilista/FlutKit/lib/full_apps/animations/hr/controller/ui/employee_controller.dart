import 'package:flutkit/full_apps/animations/hr/model/employee_detail.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/employee_add_screen.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class EmployeeController extends GetxController {
  List<EmployeeDetailModel> employeeList = [];
  List<EmployeeDetailModel> searchEmployee = [];
  TextEditingController searchController = TextEditingController();

  void searchEmployeeList(String query) {
    searchEmployee = employeeList.where((employee) {
      final employeeName = employee.name.toLowerCase();
      final employeeRole = employee.role.toLowerCase();
      final input = query.toLowerCase();
      return employeeName.contains(input) || employeeRole.contains(input);
    }).toList();
    update();
  }

  void clearSearch() {
    searchController.clear();
    update();
  }

  void goToEmployeeAddScreen() {
    Get.to(EmployeeAddScreen());
  }

  @override
  void onInit() {
    EmployeeDetailModel.getDummyList().then((value) {
      employeeList = value;
      searchEmployee = value;
      update();
    });
    super.onInit();
  }
}

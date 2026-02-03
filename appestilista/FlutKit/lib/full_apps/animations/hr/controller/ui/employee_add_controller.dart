import 'package:flutkit/full_apps/animations/hr/model/employee_detail.dart';
import 'package:flutkit/full_apps/animations/hr/views/ui/employee_screen.dart';
import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutkit/helpers/utils/my_string_utils.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';

class EmployeeAddController extends GetxController {
  final ImagePicker picker = ImagePicker();

  XFile? imageFile;
  GlobalKey<FormState> formKey = GlobalKey();
  late TextEditingController nameTe,
      emailTe,
      contactNumberTe,
      roleTe,
      salaryTe,
      totalTaskTe;

  DateTime? dobDate, joining;

  @override
  void onInit() {
    nameTe = TextEditingController(text: "a");
    emailTe = TextEditingController(text: "den@d.com");
    contactNumberTe = TextEditingController(text: "+123");
    roleTe = TextEditingController(text: "re");
    salaryTe = TextEditingController(text: "123");
    totalTaskTe = TextEditingController(text: "22");
    super.onInit();
  }

  Future<void> sendData() async {
    if (formKey.currentState!.validate()) {
      (await EmployeeDetailModel.getDummyList()).add(
        EmployeeDetailModel(
          nameTe.text,
          emailTe.text,
          contactNumberTe.text,
          roleTe.text,
          true,
          salaryTe.text.toInt(),
          totalTaskTe.text.toInt(),
          dobDate ?? DateTime.now(),
          joining ?? DateTime.now(),
          [],
        ),
      );
      Get.off(EmployeeScreen());
    }
  }

  Future<void> dobPickDate() async {
    final DateTime? picked = await showDatePicker(
        context: Get.context!,
        initialDate: dobDate ?? DateTime.now(),
        firstDate: DateTime(2015, 8),
        lastDate: DateTime(2101));
    if (picked != null && picked != dobDate) {
      dobDate = picked;
      update();
    }
  }

  Future<void> joiningDate() async {
    final DateTime? picked = await showDatePicker(
        context: Get.context!,
        initialDate: joining ?? DateTime.now(),
        firstDate: DateTime(2015, 8),
        lastDate: DateTime(2101));
    if (picked != null && picked != joining) {
      joining = picked;
      update();
    }
  }

  String? validDOB(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter DOB";
    }
    return null;
  }

  String? validName(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter name";
    }
    return null;
  }

  String? validateEmail(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter email";
    } else if (!MyStringUtils.isEmail(text)) {
      return "Please enter valid email";
    }
    return null;
  }

  String? validContactNumber(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter ContactNumber";
    }
    return null;
  }

  String? validRole(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter Employee Role";
    }
    return null;
  }

  String? validSalary(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter Salary";
    }
    return null;
  }

  String? validTask(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter Task";
    }
    return null;
  }

  String? validTotalTask(String? text) {
    if (text == null || text.isEmpty) {
      return "Please enter Total Task";
    }
    return null;
  }
}

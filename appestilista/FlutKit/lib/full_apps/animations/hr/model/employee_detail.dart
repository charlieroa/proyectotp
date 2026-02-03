import 'dart:convert';

import 'package:flutter/services.dart';

class EmployeeDetailModel {
  final String name, email, contactNumber, role;
  final bool status;
  final int salary, totalTask;
  final DateTime dob, joiningDate;
  final List<EmployeeMessage> messages;

  static List<EmployeeDetailModel>? list;

  EmployeeDetailModel(
      this.name,
      this.email,
      this.contactNumber,
      this.role,
      this.status,
      this.salary,
      this.totalTask,
      this.dob,
      this.joiningDate,
      this.messages);

  static Future<List<EmployeeDetailModel>> getDummyList() async {
    if (list == null) {
      dynamic data = json.decode(await getData());
      list = getListFromJson(data);
    }
    return list!;
  }

  static Future<EmployeeDetailModel> getOne() async {
    return (await getDummyList())[0];
  }

  static EmployeeDetailModel fromJson(Map<String, dynamic> jsonObject) {
    String name = jsonObject['name'].toString();
    String email = jsonObject['email'].toString();
    String contactNumber = jsonObject['contact_number'].toString();
    String role = jsonObject['role'].toString();
    bool status = jsonObject['status'];
    DateTime dob = DateTime.parse(jsonObject['dob'].toString());
    DateTime joiningDate =
        DateTime.parse(jsonObject['joining_date'].toString());
    int salary = int.parse(jsonObject['salary'].toString());
    int totalTask = int.parse(jsonObject['total_task'].toString());

    List<dynamic>? messagesList = jsonObject['message'];
    List<EmployeeMessage> messages = [];

    if (messagesList != null) {
      messages = EmployeeMessage.getListFromJson(messagesList);
    }

    return EmployeeDetailModel(name, email, contactNumber, role, status, salary,
        totalTask, joiningDate, dob, messages);
  }

  static List<EmployeeDetailModel> getListFromJson(List<dynamic> jsonArray) {
    List<EmployeeDetailModel> list = [];
    for (int i = 0; i < jsonArray.length; i++) {
      list.add(EmployeeDetailModel.fromJson(jsonArray[i]));
    }
    return list;
  }

  static Future<String> getData() async {
    return await rootBundle
        .loadString('assets/full_apps/animations/hr/data/employee_detail.json');
  }
}

class EmployeeMessage {
  final String message;
  final DateTime sendAt;
  late final bool fromMe;

  EmployeeMessage(this.message, this.sendAt, this.fromMe);

  static EmployeeMessage fromJson(Map<String, dynamic> jsonObject) {
    String message = jsonObject['message'].toString();
    DateTime sendAt = DateTime.parse(jsonObject['send_at'].toString());
    bool fromMe = jsonObject['from_me'];

    return EmployeeMessage(message, sendAt, fromMe);
  }

  static List<EmployeeMessage> getListFromJson(List<dynamic> jsonArray) {
    List<EmployeeMessage> list = [];
    for (int i = 0; i < jsonArray.length; i++) {
      list.add(EmployeeMessage.fromJson(jsonArray[i]));
    }
    return list;
  }
}

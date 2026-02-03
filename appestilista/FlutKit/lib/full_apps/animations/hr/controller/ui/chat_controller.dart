import 'dart:async';

import 'package:flutkit/full_apps/animations/hr/model/employee_detail.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class EmployeeChatController extends GetxController {
  EmployeeDetailModel? employeeChatModelData;
  final List<Timer> timers = [];
  final List<EmployeeMessage> chatList = [];

  void removeData(int index) {
    chatList.removeAt(index);
    update();
  }

  ScrollController? scrollController;
  TextEditingController messageController = TextEditingController();

  void sendMessage() {
    if (employeeChatModelData != null) {
      employeeChatModelData!.messages
          .add(EmployeeMessage(messageController.text, DateTime.now(), true));
      messageController.clear();
      scrollToBottom(isDelayed: true);
      update();
    }
  }

  void scrollToBottom({bool isDelayed = false}) {
    final int delay = isDelayed ? 400 : 0;
    Future.delayed(Duration(milliseconds: delay), () {
      scrollController!.animateTo(scrollController!.position.maxScrollExtent,
          duration: Duration(milliseconds: 500), curve: Curves.easeOut);
    });
  }

  @override
  void onInit() {
    scrollController = ScrollController();
    super.onInit();
  }
}

import 'dart:async';

import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';

class OtpController extends GetxController {
  TextEditingController pinPutController = TextEditingController();
  final RxBool isValid = false.obs;
  final otpFormKey = GlobalKey<FormState>();
  final focusNode = FocusNode();
  var otp = "".obs;
  final RxInt _seconds = 120.obs;
  late Timer timer;
  final RxBool _timerRunning = false.obs;
  final RxBool timerCompleted = false.obs;

  @override
  void onInit() {
    super.onInit();
    startTimer();
  }

  @override
  void onClose() {
    super.onClose();
    timer.cancel();
  }

  void startTimer() {
    if (!_timerRunning.value) {
      timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (_seconds.value > 0) {
          _seconds.value -= 1;
        } else {
          timer.cancel();
          _timerRunning.value = false;
          timerCompleted.value = true;
        }
      });
      _timerRunning.value = true;
    }
  }

  void restartTimer() {
    _seconds.value = 120;
    timerCompleted.value = false;
    startTimer();
  }

  String getFormattedTime() {
    int seconds = _seconds.value;
    int minutes = seconds ~/ 60;
    seconds = seconds % 60;
    String minutesStr = minutes.toString().padLeft(2, '0');
    String secondsStr = seconds.toString().padLeft(2, '0');
    return '$minutesStr:$secondsStr';
  }
}

import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';

class SearchScreenController extends GetxController{
  TextEditingController searchAreaController=TextEditingController();
  RxBool showShadow = false.obs;

  void updateShowShadow(bool value) {
    showShadow.value = value;
  }
}
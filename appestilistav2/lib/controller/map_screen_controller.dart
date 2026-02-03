import 'package:flutter/cupertino.dart';
import 'package:get/get.dart';

class MapScreenController extends GetxController{
  RxBool showShadow = false.obs;

  void updateShowShadow(bool value) {
    showShadow.value = value;
  }TextEditingController searchController=TextEditingController();
  final mapScreenFormKey = GlobalKey<FormState>();
}
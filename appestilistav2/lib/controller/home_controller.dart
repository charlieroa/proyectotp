import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:home_helper_flutter_ui_kit/view/my_cart_screen/my_cart_screen.dart';

import '../view/profile_screen/profile_screen.dart';
import '../view/stylist_home_screen/stylist_home_screen.dart';
import '../view/smart_queue_screen/smart_queue_screen.dart';

class HomeController extends GetxController {
  RxBool isMenuButtonVisible = true.obs;

  RxList<Widget> bottomPageList = <Widget>[
    const StylistHomeScreen(), // Home
    const SmartQueueScreen(), // Fichero Inteligente
    MyCartScreen(currentIndex: 0), // "Producto"
    const ProfileScreen(), // Perfil
  ].obs;
}

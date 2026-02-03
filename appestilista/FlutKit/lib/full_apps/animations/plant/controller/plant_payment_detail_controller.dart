import 'package:flutkit/full_apps/animations/plant/views/plant_add_to_card_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantPaymentDetailController extends GetxController {
  int selectedPaymentCart = 1;

  void selectCard(int selectCard) {
    selectedPaymentCart = selectCard;
    update();
  }

  void gotoAddToCardScreen() {
    Get.to(PlantAddToCardScreen());
  }

  void openSnackBar() {
    Get.snackbar(
      '',
      "Payment Successful",
      colorText: Colors.white,
      backgroundColor: AppTheme.plantTheme.colorScheme.primary,
      icon: Icon(LucideIcons.circle_check),
      snackPosition: SnackPosition.TOP,
      animationDuration: Duration(milliseconds: 800),
    );
  }
}

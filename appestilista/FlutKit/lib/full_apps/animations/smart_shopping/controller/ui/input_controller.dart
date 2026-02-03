import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/full_app_screen.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class InputController extends GetxController {
  final TextEditingController textEditingController = TextEditingController();
  bool showSuggestions = true;
  int tokenCount = 0;
  int inputKey = 0;

  final List<String> suggestions = [
    "Best smartphone deals 📱",
    "How to use discount coupons",
    "Fastest e-commerce delivery",
    "Trending fashion items 👗",
    "Track orders easily",
    "Flutter shopping cart tips",
    "Why carts get abandoned",
  ];

  void onSuggestionTap(String suggestion) {
    setInputWithAnimation(suggestion);
  }

  void setInputWithAnimation(String value) {
    textEditingController.text = value;
    textEditingController.selection = TextSelection.fromPosition(TextPosition(offset: value.length));
    tokenCount = value.length;
    inputKey++;
    showSuggestions = false;
    update();
  }

  void onInputChange(String value) {
    tokenCount = value.length;
    showSuggestions = value.trim().isEmpty;
    update();
  }

  void clearInputAnimated() {
    textEditingController.clear();
    tokenCount = 0;
    inputKey++;
    showSuggestions = true;
    update();
  }

  void sendInput() {
    Get.off(FullAppScreen());
  }
}

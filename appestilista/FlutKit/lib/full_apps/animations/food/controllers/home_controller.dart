import 'package:flutkit/full_apps/animations/food/models/category.dart';
import 'package:flutkit/full_apps/animations/food/models/food_item.dart';
import 'package:flutkit/full_apps/animations/food/views/single_food_item_screen.dart';
import 'package:get/get.dart';

class HomeController extends GetxController {
  List<Category> categories = [];
  List<FoodItem> foodItems = [];

  @override
  void onInit() {
    Category.dummyList.then((value) {
      categories = value;
      update();
    });
    FoodItem.dummyList.then((value) {
      foodItems = value;
      update();
    });
    super.onInit();
  }


  void goToSingleScreen(FoodItem foodItem) {
    Get.to(SingleFoodItemScreen(foodItem));
  }
}

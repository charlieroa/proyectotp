import 'package:flutkit/full_apps/animations/food/models/food_item.dart';
import 'package:flutkit/full_apps/animations/food/models/search_category.dart';
import 'package:flutkit/full_apps/animations/food/views/single_food_item_screen.dart';
import 'package:get/get.dart';

class SearchController extends GetxController {

  List<SearchCategory> categories = [];
  List<FoodItem> foodItems = [];

  @override
  void onInit() {
    FoodItem.dummyList.then((value) {
      foodItems = value;
      update();
    });
    SearchCategory.dummyList.then((value) {
      categories = value;
      update();
    });
    super.onInit();
  }


  double findAspectRatio() {
    double width = Get.size.width;
    return ((width - 60) / 2) / (198);
  }

  void goToSingleScreen(FoodItem foodItem) {
    Get.put(SingleFoodItemScreen(foodItem));
  }

}

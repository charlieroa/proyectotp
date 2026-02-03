import 'package:flutkit/full_apps/animations/food/models/food_item.dart';
import 'package:flutkit/full_apps/animations/food/views/cart_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/review_screen.dart';
import 'package:get/get.dart';

class SingleFoodItemController extends GetxController {
  bool showLoading = true, uiLoading = true;
  FoodItem foodItem;

  SingleFoodItemController(this.foodItem);

  @override
  void onInit() {
    fetchData();
    super.onInit();
  }


  void fetchData() async {
    await Future.delayed(Duration(seconds: 1));
    showLoading = false;
    uiLoading = false;
    update();
  }

  void goBack() {
    Get.back();
  }

  void goToReviewScreen() {
    Get.to(ReviewScreen());
  }

  void goToCartScreen() {
    Get.to(CartScreen());
  }

}

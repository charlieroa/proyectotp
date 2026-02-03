import 'package:flutkit/full_apps/animations/food/views/order_success_screen.dart';
import 'package:get/get.dart';

import 'package:flutkit/full_apps/animations/food/models/order_item.dart';
import 'package:flutkit/full_apps/animations/food/views/checkout_screen.dart';

class CartController extends GetxController {
  List<OrderItem> orderItems =[];

  @override
  void onInit() {
    OrderItem.dummyList.then((value) {
      orderItems = value;
      update();
    });
    super.onInit();
  }

  void goToCheckoutScreen() {
    Get.off(CheckoutScreen());
  }

  void goToOrderSuccessScreen() {
    Get.off(OrderSuccessScreen());
  }

  void increment(OrderItem orderItem) {
    orderItem.quantity++;
    update();
  }

  void decrement(OrderItem orderItem) {
    if (orderItem.quantity > 0) orderItem.quantity--;
    update();
  }

}

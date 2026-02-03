import 'package:flutkit/full_apps/animations/food/models/order_item.dart';
import 'package:get/get.dart';

class OrderController extends GetxController {
  List<OrderItem> orderItems =[];

  @override
  void onInit() {
    OrderItem.dummyList.then((value) {
      orderItems = value;
      update();
    });
    super.onInit();
  }


  void goBack() {
    Get.back();
  }
}

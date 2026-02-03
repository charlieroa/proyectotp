import 'package:flutkit/full_apps/animations/plant/model/plant_cart_data.dart';
import 'package:flutkit/full_apps/animations/plant/model/plant_data.dart';
import 'package:flutkit/full_apps/animations/plant/plant_cache.dart';
import 'package:flutkit/full_apps/animations/plant/views/plant_payment_detail_screen.dart';
import 'package:get/get.dart';

class PlantShoppingController extends GetxController {
  List<PlantCart>? plantCart = [];
  List<Plant> plant = [];
  late double order, tax = 10, offer = 50, total;

  @override
  void onInit() {
    fetchData();
    plantCart = PlantCart.getList();
    plant = Plant.getList();

    super.onInit();
  }

  void increment(PlantCart cart) {
    cart.quantity++;
    calculateBilling();
    update();
  }

  void decrement(PlantCart cart) {
    if (cart.quantity > 1) cart.quantity--;
    calculateBilling();
    update();
  }

  void fetchData() async {
    plantCart = PlantCache.plantCart;
    calculateBilling();

    update();
  }

  void calculateBilling() {
    order = 0;
    for (PlantCart cart in plantCart!) {
      order = order + (cart.price * cart.quantity);
    }
    total = order + tax - offer;
  }

  void gotoPaymentScreen() {
    Get.to(PlantPaymentDetailScreen());
  }
}

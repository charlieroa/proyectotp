import 'package:flutkit/full_apps/animations/plant/model/plant_data.dart';
import 'package:get/get.dart';

class PlantSingleProductController extends GetxController {
  List<Plant> plant = [];

  int initialRating = -1;
  bool isLiked = false;
  int itemCount = 1;

  @override
  void onInit() {
    plant = Plant.getList();
    super.onInit();
  }

  void priceIncrement() {
    itemCount++;
    update();
  }

  void priceDecrement() {
    itemCount--;
    update();
  }
}

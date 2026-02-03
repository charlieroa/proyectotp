import 'package:flutkit/full_apps/animations/plant/model/plant_data.dart';
import 'package:get/get.dart';

class PlantHomeController extends GetxController {
  // List<PlantHomeData> plantData = [];
  List<Plant> plant = [];

  @override
  void onInit() {
    plant = Plant.getList();
    // plantData = PlantCache.plantData;
    super.onInit();
  }
}

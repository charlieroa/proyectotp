import 'package:flutkit/full_apps/animations/plant/model/plant_cart_data.dart';
import 'package:flutkit/full_apps/animations/plant/model/plant_home_data.dart';

class PlantCache {
  static List<PlantHomeData> plantData = [];
  static List<PlantCart> plantCart = [];

  static Future<void> initDummy() async {
    PlantCache.plantData = await PlantHomeData.getDummyList();
  }
}

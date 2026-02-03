import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class PlantHomeData {
  final String plantName, image, price;
  final Color bgColor;

  PlantHomeData(
    this.plantName,
    this.image,
    this.price,
    this.bgColor,
  );

  static Future<List<PlantHomeData>> getDummyList() async {
    dynamic data = json.decode(await getData());
    return getListFromJson(data);
  }

  static Future<PlantHomeData> getOne() async {
    return (await getDummyList())[0];
  }

  static Future<PlantHomeData> fromJson(Map<String, dynamic> jsonObject) async {
    String plantName = jsonObject['plant_name'].toString();
    String image = jsonObject['image'].toString();
    String price = jsonObject['price'].toString();
    // Color bgColor = Color(int.parse(jsonObject['bg_color']));

    return PlantHomeData(plantName, image, price, Colors.white);
  }

  static Future<List<PlantHomeData>> getListFromJson(
      List<dynamic> jsonArray) async {
    List<PlantHomeData> list = [];
    for (int i = 0; i < jsonArray.length; i++) {
      list.add(await PlantHomeData.fromJson(jsonArray[i]));
    }
    return list;
  }

  static Future<String> getData() async {
    return await rootBundle
        .loadString('assets/full_apps/animations/plant/data/plant_data.json');
  }
}

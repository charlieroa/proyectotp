import 'dart:convert';

import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutter/services.dart';

class FoodItem {
  String name, image, description;
  double proteins, carbs, fats, calories, ratings, price;
  bool favourite;
  int reviews;

  FoodItem(
      this.name,
      this.image,
      this.description,
      this.proteins,
      this.carbs,
      this.fats,
      this.calories,
      this.ratings,
      this.price,
      this.favourite,
      this.reviews);

  static FoodItem fromJson(Map<String, dynamic> jsonObject) {
    String name = jsonObject['name'].toString();
    String image = jsonObject['image'].toString();
    String description = jsonObject['description'].toString();
    double proteins = jsonObject['proteins'].toString().toDouble();
    double carbs = jsonObject['carbs'].toString().toDouble();
    double fats = jsonObject['fats'].toString().toDouble();
    double calories = jsonObject['calories'].toString().toDouble();
    double ratings = jsonObject['ratings'].toString().toDouble();
    double price = jsonObject['price'].toString().toDouble();
    bool favourite = jsonObject['favourite'].toString().toBool();
    int reviews = jsonObject['reviews'].toString().toInt();

    return FoodItem(name, image, description, proteins, carbs, fats, calories,
        ratings, price, favourite, reviews);
  }

  static List<FoodItem> listFromJSON(List<dynamic> list) {
    return list.map((e) => FoodItem.fromJson(e)).toList();
  }

  static List<FoodItem>? _dummyList;

  static Future<List<FoodItem>> get dummyList async {
    if (_dummyList == null) {
      dynamic data = json.decode(await getData());
      _dummyList = listFromJSON(data);
    }
    return _dummyList!;
  }


  static Future<String> getData() async {
    return await rootBundle.loadString('assets/full_apps/animations/food/data/food_items.json');
  }
}

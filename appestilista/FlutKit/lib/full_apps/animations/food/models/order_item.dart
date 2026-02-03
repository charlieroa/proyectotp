import 'dart:convert';

import 'package:flutkit/full_apps/animations/food/models/food_item.dart';
import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutter/services.dart';

class OrderItem {
  FoodItem foodItem;
  int quantity;
  String date;

  OrderItem(this.foodItem, this.quantity, this.date);

  static OrderItem fromJson(Map<String, dynamic> jsonObject) {
    FoodItem foodItem = FoodItem.fromJson(jsonObject['food_item']);
    int quantity = jsonObject['quantity'].toString().toInt();
    String date = jsonObject['date'].toString();

    return OrderItem(foodItem, quantity, date);
  }

  static List<OrderItem> listFromJSON(List<dynamic> list) {
    return list.map((e) => OrderItem.fromJson(e)).toList();
  }

  static List<OrderItem>? _dummyList;

  static Future<List<OrderItem>> get dummyList async {
    if (_dummyList == null) {
      dynamic data = json.decode(await getData());
      _dummyList = listFromJSON(data);
    }
    return _dummyList!;
  }

  static Future<String> getData() async {
    return await rootBundle
        .loadString('assets/full_apps/animations/food/data/order_items.json');
  }
}

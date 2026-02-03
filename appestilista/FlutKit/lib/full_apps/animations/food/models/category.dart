import 'dart:convert';
import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutter/services.dart';

class Category {
  String name, image;
  int dishes;
  Color color;

  Category(this.name, this.image, this.dishes, this.color);

  static Category fromJson(Map<String, dynamic> jsonObject) {
    String name = jsonObject['name'].toString();
    String image = jsonObject['image'].toString();
    int dishes = jsonObject['dishes'].toString().toInt();
    Color color = jsonObject['color'].toString().toColor;

    return Category(name, image, dishes, color);
  }

  static List<Category> listFromJSON(List<dynamic> list) {
    return list.map((e) => Category.fromJson(e)).toList();
  }

  static List<Category>? _dummyList;

  static Future<List<Category>> get dummyList async {
    if (_dummyList == null) {
      dynamic data = json.decode(await getData());
      _dummyList = listFromJSON(data);
    }
    return _dummyList!;
  }


  static Future<String> getData() async {
    return await rootBundle.loadString('assets/full_apps/animations/food/data/categories.json');
  }
}

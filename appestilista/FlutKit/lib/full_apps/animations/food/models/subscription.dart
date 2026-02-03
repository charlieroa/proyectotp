import 'dart:convert';

import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutter/services.dart';

class Subscription {
  String type, description;
  double price;
  List<String> benefits;

  Subscription(this.type, this.description, this.price, this.benefits);


  static Subscription fromJson(Map<String, dynamic> jsonObject) {
    String type = jsonObject['type'].toString();
    String description = jsonObject['description'].toString();
    double price = jsonObject['price'].toString().toDouble();
    List<String> benefits = getBenefitList(jsonObject['benefits']);
    return Subscription(type, description, price, benefits);
  }

  static List<String> getBenefitList(List<dynamic> jsonArray) {
    List<String> list = [];
    for (int i = 0; i < jsonArray.length; i++) {
      list.add(jsonArray[i].toString());
    }
    return list;
  }

  static List<Subscription> listFromJSON(List<dynamic> list) {
    return list.map((e) => Subscription.fromJson(e)).toList();
  }

  static List<Subscription>? _dummyList;

  static Future<List<Subscription>> get dummyList async {
    if (_dummyList == null) {
      dynamic data = json.decode(await getData());
      _dummyList = listFromJSON(data);
    }
    return _dummyList!;
  }

  static Future<String> getData() async {
    return await rootBundle.loadString('assets/full_apps/animations/food/data/subscriptions.json');
  }
}

import 'dart:convert';

import 'package:flutter/services.dart';

class PaymentMethod {
  String method, cardNumber, icon;

  PaymentMethod(this.method, this.cardNumber, this.icon);


  static PaymentMethod fromJson(Map<String, dynamic> jsonObject) {
    String method = jsonObject['method'].toString();
    String cardNumber = jsonObject['card_number'].toString();
    String icon = jsonObject['icon'].toString();

    return PaymentMethod(method, cardNumber, icon);
  }


  static List<PaymentMethod> listFromJSON(List<dynamic> list) {
    return list.map((e) => PaymentMethod.fromJson(e)).toList();
  }

  static List<PaymentMethod>? _dummyList;

  static Future<List<PaymentMethod>> get dummyList async {
    if (_dummyList == null) {
      dynamic data = json.decode(await getData());
      _dummyList = listFromJSON(data);
    }
    return _dummyList!;
  }

  static Future<String> getData() async {
    return await rootBundle
        .loadString('assets/full_apps/animations/food/data/payment_methods.json');
  }
}

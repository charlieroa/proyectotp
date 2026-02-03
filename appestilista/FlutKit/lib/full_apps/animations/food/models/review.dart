import 'dart:convert';
import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutter/services.dart';

class Review {
  String name, image, review;
  double ratings;

  Review(this.name, this.image, this.review, this.ratings);

  static Review fromJson(Map<String, dynamic> jsonObject) {
    String name = jsonObject['name'].toString();
    String image = jsonObject['image'].toString();
    String review = jsonObject['review'].toString();
    double ratings = jsonObject['ratings'].toString().toDouble();

    return Review(name, image, review, ratings);
  }


  static List<Review> listFromJSON(List<dynamic> list) {
    return list.map((e) => Review.fromJson(e)).toList();
  }

  static List<Review>? _dummyList;

  static Future<List<Review>> get dummyList async {
    if (_dummyList == null) {
      dynamic data = json.decode(await getData());
      _dummyList = listFromJSON(data);
    }
    return _dummyList!;
  }


  static Future<String> getData() async {
    return await rootBundle.loadString('assets/full_apps/animations/food/data/reviews.json');
  }
}

import 'dart:convert';

import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutter/services.dart';

class RecentExercise {
  String name, duration, image;
  Color color;

  RecentExercise(this.name, this.duration, this.image, this.color);

  static Future<List<RecentExercise>> getDummyList() async {
    dynamic data = json.decode(await getData());
    return getListFromJson(data);
  }

  static Future<RecentExercise> getOne() async {
    return (await getDummyList())[0];
  }

  static RecentExercise fromJson(Map<String, dynamic> jsonObject) {
    String name = jsonObject['name'].toString();
    String duration = jsonObject['duration'].toString();
    String image = jsonObject['image'].toString();
    Color color = jsonObject['color'].toString().toColor;

    return RecentExercise(name, duration, image, color);
  }

  static List<RecentExercise> getListFromJson(List<dynamic> jsonArray) {
    List<RecentExercise> list = [];
    for (int i = 0; i < jsonArray.length; i++) {
      list.add(RecentExercise.fromJson(jsonArray[i]));
    }
    return list;
  }

  static Future<String> getData() async {
    return await rootBundle.loadString(
        'assets/full_apps/others/fitness/data/recent_exercises.json');
  }
}

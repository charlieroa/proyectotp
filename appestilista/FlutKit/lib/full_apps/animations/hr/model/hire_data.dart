import 'dart:convert';

import 'package:flutter/services.dart';

class HireDataModel {
  final String name, title, skill, jobType, time;

  HireDataModel(this.name, this.title, this.skill, this.jobType, this.time);

  static Future<List<HireDataModel>> getDummyList() async {
    dynamic data = json.decode(await getData());
    return getListFromJson(data);
  }

  static Future<HireDataModel> getOne() async {
    return (await getDummyList())[0];
  }

  static Future<HireDataModel> fromJson(Map<String, dynamic> jsonObject) async {
    String name = jsonObject['name'].toString();
    String title = jsonObject['title'].toString();
    String skill = jsonObject['skill'].toString();
    String jobType = jsonObject['job_type'].toString();
    String time = jsonObject['time'].toString();

    return HireDataModel(name, title, skill, jobType, time);
  }

  static Future<List<HireDataModel>> getListFromJson(
      List<dynamic> jsonArray) async {
    List<HireDataModel> list = [];
    for (int i = 0; i < jsonArray.length; i++) {
      list.add(await HireDataModel.fromJson(jsonArray[i]));
    }
    return list;
  }

  static Future<String> getData() async {
    return await rootBundle
        .loadString('assets/full_apps/animations/hr/data/hire_data.json');
  }
}

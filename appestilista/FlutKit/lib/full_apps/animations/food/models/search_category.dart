import 'dart:convert';

import 'package:flutter/services.dart';

class SearchCategory {
  String name, icon;

  SearchCategory(this.name, this.icon);

  static SearchCategory fromJson(Map<String, dynamic> jsonObject) {
    String name = jsonObject['name'].toString();
    String icon = jsonObject['icon'].toString();

    return SearchCategory(name, icon);
  }

  static List<SearchCategory> listFromJSON(List<dynamic> list) {
    return list.map((e) => SearchCategory.fromJson(e)).toList();
  }

  static List<SearchCategory>? _dummyList;

  static Future<List<SearchCategory>> get dummyList async {
    if (_dummyList == null) {
      dynamic data = json.decode(await getData());
      _dummyList = listFromJSON(data);
    }
    return _dummyList!;
  }

  static Future<String> getData() async {
    return await rootBundle
        .loadString('assets/full_apps/animations/food/data/search_categories.json');
  }
}

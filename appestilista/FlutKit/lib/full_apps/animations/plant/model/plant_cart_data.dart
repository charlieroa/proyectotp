import 'package:flutkit/helpers/utils/generator.dart';
import 'package:flutter/material.dart';

class PlantCart {
  final String image, title, description;
  int price, quantity;
  final Color color;

  PlantCart(this.image, this.title, this.price, this.quantity, this.description,
      this.color);

  static List<PlantCart> getList() {
    return [
      PlantCart('assets/images/full_apps/plant/images/1.png', 'Rose', 20, 2,
          Generator.getDummyText(8), Colors.red.withAlpha(50)),
      PlantCart('assets/images/full_apps/plant/images/2.png', 'Tulip', 50, 1,
          Generator.getDummyText(8), Colors.green.withAlpha(50)),
    ];
  }
}

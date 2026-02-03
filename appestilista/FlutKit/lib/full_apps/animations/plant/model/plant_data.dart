import 'package:flutkit/helpers/utils/generator.dart';
import 'package:flutter/material.dart';

class Plant {
  final String image, title, description;
  int price, quantity;
  final Color color;

  Plant(this.image, this.title, this.price, this.quantity, this.description,
      this.color);

  static List<Plant> getList() {
    return [
      Plant('assets/images/full_apps/plant/images/1.png', 'Rose', 20, 1,
          Generator.getDummyText(8), Colors.red.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/2.png', 'Tulip', 50, 2,
          Generator.getDummyText(8), Colors.green.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/3.png', 'Sunflower', 14, 4,
          Generator.getDummyText(8), Colors.yellow.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/4.png', 'Lily', 10, 2,
          Generator.getDummyText(8), Colors.pink.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/5.png', 'Carnation', 30, 1,
          Generator.getDummyText(8), Colors.purple.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/6.png', 'Jasmine', 15, 2,
          Generator.getDummyText(8), Colors.red.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/7.png', 'Orchid', 25, 3,
          Generator.getDummyText(8), Colors.green.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/8.png', 'Daffodil', 30, 8,
          Generator.getDummyText(8), Colors.yellow.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/9.png', 'Marigold', 18, 1,
          Generator.getDummyText(8), Colors.pink.withAlpha(50)),
      Plant('assets/images/full_apps/plant/images/10.png', 'Lavender', 60, 5,
          Generator.getDummyText(8), Colors.purple.withAlpha(50)),
    ];
  }
}

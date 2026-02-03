import 'package:flutter/cupertino.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class Category {
  final IconData icon;
  final String title;

  Category(this.icon, this.title);

  static List<Category> getList() {
    return [
      Category(LucideIcons.chef_hat, "All"),
      Category(LucideIcons.cup_soda, "Fast-food"),
      Category(LucideIcons.pizza, "Pizza"),
      Category(LucideIcons.cake, "Cake"),
      Category(LucideIcons.cookie, "Sea Food"),
      Category(LucideIcons.coffee, "Tea"),
    ];
  }
}

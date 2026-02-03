import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ShippingAddress {
  String type, name, address, number;
  bool isDefault;
  IconData icon;

  ShippingAddress(this.type, this.name, this.address, this.number,
      this.isDefault, this.icon);

  static List<ShippingAddress> shipping() {
    List<ShippingAddress> list = [];

    list.add(ShippingAddress(
        'Work',
        'Muhammad raza',
        'Room 1 - Ground Floor, Al Najoum Building, 24 B Street, Dubai - United Arab Emirates.',
        '+971-50-1234567',
        true,
        LucideIcons.briefcase));
    list.add(ShippingAddress(
        'Home',
        'Muhammad raza',
        'Abu Dhabi Mall - 10th St - Al Zahiyah, Abu Dhabi - United Arab Emirates.',
        '+971-50-1234567',
        false,
        LucideIcons.house));

    return list;
  }
}

import 'package:flutter/cupertino.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ShippingAddress {
  String type, address;
  IconData icon;

  ShippingAddress(this.type, this.address, this.icon);

  static List<ShippingAddress> addressList() {
    List<ShippingAddress> list = [];

    list.add(
      ShippingAddress('Home', '512, Saint Street, New York', LucideIcons.house),
    );
    list.add(
      ShippingAddress(
          'Office', 'A-25, Queen Street, Sydney', LucideIcons.map_pin),
    );

    return list;
  }
}

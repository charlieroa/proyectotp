import 'package:flutkit/full_apps/animations/smart_shopping/model/product.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/details_screen.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class SearchController extends GetxController {
  List<Product>? allProducts;
  List<Product>? filteredProducts;
  final TextEditingController searchController = TextEditingController();

  String selectedCategory = "All";

  @override
  void onInit() {
    Product.getDummyList().then((value) {
      allProducts = value;
      filteredProducts = value;
      update();
    });
    super.onInit();
  }

  void searchProducts(String query) {
    filteredProducts = allProducts?.where((product) {
      final matchesQuery =
          product.name.toLowerCase().contains(query.toLowerCase()) || product.description.toLowerCase().contains(query.toLowerCase());

      final matchesCategory = selectedCategory == "All" || product.category == selectedCategory;

      return matchesQuery && matchesCategory;
    }).toList();

    update();
  }

  void goToSingleProduct() {
    Get.to(() => DetailsScreen());
  }
}

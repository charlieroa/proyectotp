import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/details_screen.dart';
import 'package:get/get.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/model/product.dart';

class HomeScreenController extends GetxController {
  List<Product>? allProducts;
  List<Product>? filteredProducts;

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
    if (query.isEmpty) {
      filteredProducts = allProducts;
    } else {
      filteredProducts = allProducts!
          .where(
            (product) =>
                product.name.toLowerCase().contains(query.toLowerCase()) || product.description.toLowerCase().contains(query.toLowerCase()),
          )
          .toList();
    }
    update();
  }

  void goToSingleProduct() {
    Get.to(() => DetailsScreen());
  }
}

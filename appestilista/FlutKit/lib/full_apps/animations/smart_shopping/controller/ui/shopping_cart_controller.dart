import 'package:flutkit/full_apps/animations/smart_shopping/model/cart.dart';
import 'package:get/get.dart';

class ShoppingCartController extends GetxController {
  List<Cart>? carts;
  late double order, tax = 30, offer = 50, total;

  String? couponCode;
  bool couponApplied = false;
  double couponDiscount = 0;

  final Map<String, double> validCoupons = {'SAVE50': 50, 'DISCOUNT10': 10, 'FREESHIP': 20};

  @override
  void onInit() {
    Cart.getDummyList().then((value) {
      carts = value;
      update();
    });
    calculateBilling();
    super.onInit();
  }

  bool increaseAble(Cart cart) => cart.quantity < cart.product.quantity;
  bool decreaseAble(Cart cart) => cart.quantity > 1;

  void increment(Cart cart) {
    if (!increaseAble(cart)) return;
    cart.quantity++;
    calculateBilling();
    update();
  }

  void decrement(Cart cart) {
    if (!decreaseAble(cart)) return;
    cart.quantity--;
    calculateBilling();
    update();
  }

  void applyCoupon(String code) {
    if (couponApplied) {
      return;
    }
    code = code.toUpperCase();
    if (validCoupons.containsKey(code)) {
      couponCode = code;
      couponDiscount = validCoupons[code]!;
      couponApplied = true;
      calculateBilling();
      update();
    }
  }

  void calculateBilling() {
    order = 0;
    for (var cart in carts ?? []) {
      order += cart.product.price * cart.quantity;
    }
    total = order + tax - offer - couponDiscount;
    if (total < 0) total = 0;
  }
}

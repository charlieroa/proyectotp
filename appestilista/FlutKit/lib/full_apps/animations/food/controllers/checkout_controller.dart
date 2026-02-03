import 'package:flutkit/full_apps/animations/food/models/payment_method.dart';
import 'package:flutkit/full_apps/animations/food/models/shipping_address.dart';
import 'package:flutkit/full_apps/animations/food/views/order_success_screen.dart';
import 'package:get/get.dart';

class CheckoutController extends GetxController {
  bool showLoading = true, uiLoading = true;
  List<ShippingAddress>? shippingAddressList;
  List<PaymentMethod> paymentMethods = [];
  late ShippingAddress shippingAddress;
  late PaymentMethod paymentMethod;

  @override
  void onInit() {
    fetchData();
    PaymentMethod.dummyList.then((value) {
      paymentMethods = value;
      update();
    });
    super.onInit();
  }

  void fetchData() async {
    shippingAddressList = ShippingAddress.addressList();
    shippingAddress = shippingAddressList!.first;
    paymentMethod = paymentMethods.first;
    await Future.delayed(Duration(seconds: 1));
    showLoading = false;
    uiLoading = false;
    update();
  }

  void selectAddress(ShippingAddress address) {
    shippingAddress = address;
    update();
  }

  void selectPaymentMethod(PaymentMethod method) {
    paymentMethod = method;
    update();
  }

  void goBack() {
    Get.back();
  }

  void goToOrderSuccessScreen() {
    Get.off(OrderSuccessScreen());
  }
}

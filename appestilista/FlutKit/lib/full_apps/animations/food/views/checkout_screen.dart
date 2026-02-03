import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/checkout_controller.dart';
import 'package:flutkit/full_apps/animations/food/models/payment_method.dart';
import 'package:flutkit/full_apps/animations/food/models/shipping_address.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({super.key});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late CheckoutController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(CheckoutController());
  }

  Widget _buildShippingAddressList() {
    List<Widget> list = [];

    for (ShippingAddress shippingAddress in controller.shippingAddressList!) {
      bool selected = controller.shippingAddress == shippingAddress;
      list.add(MyContainer.bordered(
        onTap: () {
          controller.selectAddress(shippingAddress);
        },
        color: selected ? theme.scaffoldBackgroundColor : customTheme.card,
        paddingAll: 12,
        borderRadiusAll: 8,
        margin: MySpacing.bottom(20),
        child: Row(
          children: [
            Icon(
              shippingAddress.icon,
              size: 18,
              color: selected
                  ? customTheme.foodPrimary
                  : theme.colorScheme.onSurface,
            ),
            MySpacing.width(20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: MyText.bodyMedium(
                          shippingAddress.type,
                          fontWeight: 600,
                          color: selected
                              ? customTheme.foodPrimary
                              : theme.colorScheme.onSurface,
                        ),
                      ),
                      selected
                          ? MyContainer.rounded(
                              paddingAll: 4,
                              color: customTheme.foodPrimary.withAlpha(60),
                              child: Icon(
                                LucideIcons.check,
                                size: 12,
                                color: customTheme.foodPrimary,
                              ),
                            )
                          : Container(),
                    ],
                  ),
                  MySpacing.height(4),
                  MyText.bodyMedium(
                    shippingAddress.address,
                  ),
                ],
              ),
            ),
          ],
        ),
      ));
    }
    return Column(
      children: list,
    );
  }

  Widget _buildPaymentMethodList() {
    List<Widget> list = [];

    for (PaymentMethod paymentMethod in controller.paymentMethods) {
      bool selected = controller.paymentMethod == paymentMethod;
      list.add(MyContainer.bordered(
        onTap: () {
          controller.selectPaymentMethod(paymentMethod);
        },
        color: selected ? theme.scaffoldBackgroundColor : customTheme.card,
        paddingAll: 12,
        borderRadiusAll: 8,
        margin: MySpacing.bottom(20),
        child: Row(
          children: [
            MyContainer(
              paddingAll: 0,
              borderRadiusAll: 0,
              child: Image(
                height: 32,
                width: 48,
                image: AssetImage(paymentMethod.icon),
              ),
            ),
            MySpacing.width(20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: MyText.bodyMedium(
                          paymentMethod.method,
                          fontWeight: 600,
                          color: selected
                              ? customTheme.foodPrimary
                              : theme.colorScheme.onSurface,
                        ),
                      ),
                      selected
                          ? MyContainer.rounded(
                              paddingAll: 4,
                              color: customTheme.foodPrimary.withAlpha(60),
                              child: Icon(
                                LucideIcons.check,
                                size: 12,
                                color: customTheme.foodPrimary,
                              ),
                            )
                          : Container(),
                    ],
                  ),
                  MySpacing.height(4),
                  MyText.bodyMedium(
                    paymentMethod.cardNumber,
                  ),
                ],
              ),
            ),
          ],
        ),
      ));
    }
    return Column(
      children: list,
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<CheckoutController>(
        init: controller,
        tag: 'food_checkout_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
    return Scaffold(
      body: Padding(
        padding:
            MySpacing.fromLTRB(20, MySpacing.safeAreaTop(context) + 20, 20, 20),
        child: Column(
          children: [
            Row(
              children: [
                MyContainer(
                  onTap: () {
                    controller.goBack();
                  },
                  color: customTheme.foodPrimary.withAlpha(40),
                  paddingAll: 8,
                  child: Icon(
                    LucideIcons.chevron_left,
                    size: 20,
                  ),
                ),
                Expanded(
                  child: MyText.titleMedium(
                    'Checkout',
                    fontWeight: 600,
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
            MySpacing.height(20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  MyText.titleMedium(
                    'Shipping Address',
                    fontWeight: 600,
                  ),
                  MySpacing.height(20),
                  _buildShippingAddressList(),
                  MyText.titleMedium(
                    'Payment Method',
                    fontWeight: 600,
                  ),
                  MySpacing.height(20),
                  _buildPaymentMethodList(),
                ],
              ),
            ),
            MySpacing.height(20),
            MyButton.block(
              onPressed: () {
                controller.goToOrderSuccessScreen();
              },
              elevation: 0,
              borderRadiusAll: 8,
              splashColor: customTheme.foodOnPrimary.withAlpha(60),
              backgroundColor: customTheme.foodPrimary,
              child: MyText.labelLarge(
                'Proceed to Payment',
                color: customTheme.foodOnPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

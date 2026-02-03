import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/ui/check_out_controller.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/full_app_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class CheckOutScreen extends StatefulWidget {
  const CheckOutScreen({super.key});

  @override
  State<CheckOutScreen> createState() => _CheckOutScreenState();
}

class _CheckOutScreenState extends State<CheckOutScreen> {
  late ThemeData theme;
  late CheckOutController controller;

  @override
  void initState() {
    controller = Get.put(CheckOutController());
    theme = AppTheme.smartShopping;
    super.initState();
  }

  Widget _buildAddressTile(int index, String title, String phone, String address) {
    bool selected = controller.selectedAddress == index;

    return MyContainer.bordered(
      bordered: selected,
      borderColor: theme.colorScheme.primary,
      margin: MySpacing.bottom(12),
      borderRadiusAll: 12,
      splashColor: Colors.transparent,
      onTap: () => setState(() => controller.selectedAddress = index),
      child: Row(
        children: [
          Icon(LucideIcons.map_pin, color: selected ? theme.colorScheme.primary : Colors.grey.shade600, size: 18),
          MySpacing.width(12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                MyText.bodyMedium(title, fontWeight: 600),
                MySpacing.height(4),
                MyText.labelMedium(phone, muted: true),
                MySpacing.height(4),
                MyText.labelMedium(address, muted: true),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentOption(int index, String name, String asset) {
    bool selected = controller.selectedPayment == index;

    return MyContainer.bordered(
      bordered: selected,
      borderColor: theme.colorScheme.primary,
      margin: MySpacing.bottom(12),
      splashColor: Colors.transparent,
      borderRadiusAll: 12,
      onTap: () => setState(() => controller.selectedPayment = index),
      child: Row(
        children: [
          Image.asset(asset, height: 28, width: 28),
          MySpacing.width(12),
          Expanded(child: MyText.bodyMedium(name, fontWeight: 600)),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(String title, String value, {bool isTotal = false}) {
    return Padding(
      padding: MySpacing.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          MyText.bodyMedium(title, fontSize: isTotal ? 18 : 14, fontWeight: isTotal ? 700 : 600),
          MyText.bodyMedium(value, fontSize: isTotal ? 18 : 14, fontWeight: 600, color: isTotal ? theme.colorScheme.primary : null),
        ],
      ),
    );
  }

  Widget _buildSummaryBox() {
    double shipping = 30.0;
    double subtotal = 654.99;
    double total = shipping + subtotal;

    return MyContainer(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
      padding: MySpacing.fromLTRB(20, 24, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildSummaryRow('Shipping fee', '\$${shipping.toStringAsFixed(2)}'),
          _buildSummaryRow('Sub total', '\$${subtotal.toStringAsFixed(2)}'),
          const Divider(height: 30, thickness: 1.2),
          _buildSummaryRow('Total', '\$${total.toStringAsFixed(2)}', isTotal: true),
          MySpacing.height(20),
          MyContainer(
            onTap: () {
              Get.offAll(FullAppScreen());
            },
            color: theme.colorScheme.primary,
            paddingAll: 12,
            borderRadiusAll: 100,
            child: Center(child: MyText.labelMedium("Pay Now", color: theme.colorScheme.onPrimary)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<CheckOutController>(
      init: controller,
      builder: (controller) {
        return AppLayout(
          child: Scaffold(
            backgroundColor: Colors.transparent,
            appBar: AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              leading: IconButton(icon: const Icon(Icons.arrow_back_ios_new, size: 16), onPressed: () => Navigator.pop(context)),
              title: MyText.titleMedium('Checkout', fontWeight: 600),
              centerTitle: true,
            ),
            body: Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: MySpacing.fromLTRB(20, 12, 20, 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText.bodyMedium('Shipping Address', fontWeight: 600),
                        MySpacing.height(12),
                        _buildAddressTile(0, 'Home', '(995) 514-123-456', '5 Lermontov Street'),
                        _buildAddressTile(1, 'Office', '(995) 514-654-321', '88 Freedom Square'),
                        _buildAddressTile(2, 'Summer House', '(995) 514-987-654', '17 Batumi Highway'),
                        MySpacing.height(12),
                        MyText.bodyMedium('Payment Method', fontWeight: 600),
                        MySpacing.height(12),
                        _buildPaymentOption(0, 'Credit Card', Images.masterCard),
                        _buildPaymentOption(1, 'PayPal', 'assets/brand/paypal.png'),
                        _buildPaymentOption(2, 'Apple Pay', Images.apple),
                        MySpacing.height(100),
                      ],
                    ),
                  ),
                ),
                _buildSummaryBox(),
              ],
            ),
          ),
        );
      },
    );
  }
}

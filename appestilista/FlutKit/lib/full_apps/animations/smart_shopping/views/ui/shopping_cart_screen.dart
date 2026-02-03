import 'package:flutkit/full_apps/animations/smart_shopping/app_layout.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/controller/ui/shopping_cart_controller.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/model/cart.dart';
import 'package:flutkit/full_apps/animations/smart_shopping/views/ui/check_out_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_dashed_divider.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/helpers/widgets/my_text_style.dart';
import 'package:flutter/material.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class ShoppingCartScreen extends StatefulWidget {
  const ShoppingCartScreen({super.key});

  @override
  State<ShoppingCartScreen> createState() => _ShoppingCartScreenState();
}

class _ShoppingCartScreenState extends State<ShoppingCartScreen> {
  late ShoppingCartController controller;
  late ThemeData theme;
  late OutlineInputBorder border;

  @override
  void initState() {
    super.initState();
    controller = Get.put(ShoppingCartController());
    theme = AppTheme.smartShopping;
    border = OutlineInputBorder(borderRadius: BorderRadius.circular(100), borderSide: BorderSide.none);
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ShoppingCartController>(
      init: controller,
      builder: (_) {
        return AppLayout(child: _buildBody());
      },
    );
  }

  Widget _buildCartItem() {
    List<Widget> list = [];

    for (Cart cart in controller.carts ?? []) {
      bool increaseAble = controller.increaseAble(cart);
      bool decreaseAble = controller.decreaseAble(cart);

      list.add(
        MyContainer(
          borderRadiusAll: 16,
          paddingAll: 12,
          margin: MySpacing.bottom(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.asset(cart.product.image, height: 100, width: 100, fit: BoxFit.cover),
              ),
              MySpacing.width(16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: MyText.titleSmall(cart.product.name, fontWeight: 700, overflow: TextOverflow.ellipsis)),
                        MyText.bodyMedium('\$${cart.product.price.toStringAsFixed(2)}', fontWeight: 800, color: theme.colorScheme.primary),
                      ],
                    ),
                    MySpacing.height(12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        MyText.bodySmall("Size: ${cart.selectedSize}", fontWeight: 600),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            MyText.bodySmall("Color: "),
                            MySpacing.width(4),
                            MyContainer.rounded(paddingAll: 8, color: cart.selectedColor),
                          ],
                        ),
                      ],
                    ),
                    MySpacing.height(12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        MyContainer(
                          color: theme.colorScheme.primary.withValues(alpha: 0.08),
                          borderRadiusAll: 100,
                          padding: MySpacing.all(6),
                          child: Row(
                            children: [
                              _buildQuantityButton(icon: LucideIcons.minus, onTap: () => controller.decrement(cart), enabled: decreaseAble),
                              MySpacing.width(12),
                              MyText.labelLarge(cart.quantity.toString(), fontWeight: 700),
                              MySpacing.width(12),
                              _buildQuantityButton(icon: LucideIcons.plus, onTap: () => controller.increment(cart), enabled: increaseAble),
                            ],
                          ),
                        ),
                        IconButton(
                          onPressed: () {
                            controller.carts!.remove(cart);
                            controller.calculateBilling();
                            controller.update();
                          },
                          icon: Icon(LucideIcons.trash_2, size: 20, color: theme.colorScheme.error.withValues(alpha: 0.8)),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(children: list);
  }

  Widget _buildQuantityButton({required IconData icon, required VoidCallback onTap, required bool enabled}) {
    return MyContainer.rounded(
      onTap: enabled ? onTap : null,
      padding: MySpacing.all(6),
      color: enabled ? theme.colorScheme.primary : theme.colorScheme.onSurface.withAlpha(40),
      child: Icon(icon, size: 14, color: enabled ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface.withAlpha(120)),
    );
  }

  Widget _billingWidget() {
    TextEditingController couponController = TextEditingController();

    final availableCoupons = ['SAVE50', 'DISCOUNT10', 'FREESHIP'];

    return MyContainer(
      borderRadiusAll: 16,
      paddingAll: 20,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(LucideIcons.receipt, size: 20, color: theme.colorScheme.primary),
              MySpacing.width(8),
              MyText.titleMedium('Billing Summary', fontWeight: 700),
            ],
          ),
          MySpacing.height(16),
          if (!controller.couponApplied) ...[
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    style: MyTextStyle.labelMedium(fontWeight: 600, color: theme.colorScheme.onPrimaryContainer),
                    controller: couponController,
                    cursorColor: theme.colorScheme.primary,
                    decoration: InputDecoration(
                      hintText: "Enter coupon code",
                      hintStyle: MyTextStyle.bodyMedium(color: theme.colorScheme.onPrimaryContainer),
                      prefixIcon: Icon(LucideIcons.badge_percent, color: theme.colorScheme.primary),
                      contentPadding: MySpacing.all(14),
                      isDense: true,
                      isCollapsed: true,
                      filled: true,
                      fillColor: theme.colorScheme.primaryContainer,
                      border: border,
                      enabledBorder: border,
                      focusedBorder: border,
                      errorBorder: border,
                      focusedErrorBorder: border,
                    ),
                  ),
                ),
                MySpacing.width(12),
                MyButton.rounded(
                  onPressed: () {
                    String code = couponController.text.trim();
                    if (code.isEmpty) return;
                    controller.applyCoupon(code);
                    couponController.clear();
                  },
                  elevation: 0,
                  padding: MySpacing.xy(16, 12),
                  backgroundColor: theme.colorScheme.primary,
                  child: MyText.labelMedium("Apply", color: theme.colorScheme.onPrimary),
                ),
              ],
            ),
            MySpacing.height(16),
            MyText.bodySmall('Available Coupons:', fontWeight: 600),
            MySpacing.height(8),
            Wrap(
              spacing: 8,
              children: availableCoupons.map((coupon) {
                return InkWell(
                  onTap: () => couponController.text = coupon,
                  child: Chip(
                    label: Text(coupon),
                    backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.1),
                    labelStyle: TextStyle(color: theme.colorScheme.primary),
                  ),
                );
              }).toList(),
            ),
            MySpacing.height(20),
          ] else
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                MyText.bodyMedium("Coupon Applied: ${controller.couponCode}", fontWeight: 600, color: theme.colorScheme.primary),
                Icon(Icons.check_circle, color: theme.colorScheme.primary, size: 20),
              ],
            ),

          MySpacing.height(16),
          _buildBillingRow(label: 'Order Total', value: '\$${controller.order.toStringAsFixed(2)}'),
          _buildBillingRow(label: 'Tax', value: '\$${controller.tax.toStringAsFixed(2)}'),
          _buildBillingRow(label: 'Offer', value: '- \$${controller.offer.toStringAsFixed(2)}', valueColor: theme.colorScheme.error),

          if (controller.couponApplied)
            _buildBillingRow(
              label: 'Coupon (${controller.couponCode})',
              value: '- \$${controller.couponDiscount.toStringAsFixed(2)}',
              valueColor: Colors.green,
            ),
          MySpacing.height(12),
          MyDashedDivider(dashWidth: 6, dashSpace: 3, color: theme.colorScheme.onSurface.withAlpha(120), height: 1.2),
          MySpacing.height(16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              MyText.titleMedium('Grand Total', fontWeight: 800),
              MyContainer(
                padding: MySpacing.xy(12, 6),
                borderRadiusAll: 4,
                color: theme.colorScheme.primary.withValues(alpha: 0.2),
                child: MyText.bodyMedium('\$${controller.total.toStringAsFixed(2)}', color: theme.colorScheme.primary, fontWeight: 600),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBillingRow({required String label, required String value, Color? valueColor}) {
    return Padding(
      padding: MySpacing.bottom(8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          MyText.bodyMedium(label, fontWeight: 600),
          MyText.bodyMedium(value, fontWeight: 700, color: valueColor),
        ],
      ),
    );
  }

  Widget _buildBody() {
    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: MyText.titleMedium('Cart', fontWeight: 700),
        centerTitle: false,
      ),
      body: ListView(padding: MySpacing.nTop(20), children: [_buildCartItem()]),
      bottomNavigationBar: Padding(
        padding: MySpacing.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _billingWidget(),
            MySpacing.height(20),
            MyButton.block(
              onPressed: () => Get.to(CheckOutScreen()),
              backgroundColor: theme.colorScheme.primary,
              elevation: 0,
              padding: MySpacing.xy(16, 20),
              borderRadiusAll: 100,
              child: Center(child: MyText.bodyMedium('Checkout', fontWeight: 600, color: theme.colorScheme.onPrimary)),
            ),
          ],
        ),
      ),
    );
  }
}

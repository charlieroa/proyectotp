import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/cart_controller.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class CartScreen extends StatefulWidget {
  const CartScreen({super.key});

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late CartController controller;


  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;
    controller = Get.put(CartController());
  }

  Widget _buildCartList() {
    List<Widget> list = [];

    for (int i = 0; i < controller.orderItems.length; i++) {
      list.add(Container(
        margin: MySpacing.bottom(12),
        child: Row(
          children: [
            MyContainer(
              paddingAll: 0,
              borderRadiusAll: 8,
              clipBehavior: Clip.antiAliasWithSaveLayer,
              height: 96,
              width: 96,
              child: Image(
                fit: BoxFit.cover,
                image: AssetImage(controller.orderItems[i].foodItem.image),
              ),
            ),
            MySpacing.width(20),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MyText.bodySmall(
                  controller.orderItems[i].foodItem.name,
                  fontWeight: 600,
                ),
                MySpacing.height(8),
                MyText.bodySmall(
                  '\$${controller.orderItems[i].foodItem.price}',
                  fontWeight: 700,
                ),
                MySpacing.height(12),
                Row(
                  children: [
                    MyContainer.roundBordered(
                      onTap: () {
                        controller.decrement(controller.orderItems[i]);
                      },
                      paddingAll: 6,
                      color: theme.scaffoldBackgroundColor,
                      child: Icon(
                        LucideIcons.minus,
                        size: 14,
                      ),
                    ),
                    MySpacing.width(10),
                    MyText.bodySmall(
                      controller.orderItems[i].quantity.toString(),
                      fontWeight: 600,
                    ),
                    MySpacing.width(10),
                    MyContainer.roundBordered(
                      onTap: () {
                        controller.increment(controller.orderItems[i]);
                      },
                      paddingAll: 6,
                      color: theme.scaffoldBackgroundColor,
                      child: Icon(
                        LucideIcons.plus,
                        size: 14,
                      ),
                    ),
                    MySpacing.width(80),
                    Icon(
                      LucideIcons.trash_2,
                      size: 16,
                    ),
                  ],
                ),
              ],
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
    return GetBuilder<CartController>(
        init: controller,
        tag: 'food_cart_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
      return Scaffold(
        body: ListView(
          padding: MySpacing.fromLTRB(
              20, MySpacing.safeAreaTop(context) + 10, 20, 20),
          children: [
            Row(
              children: [
                MyText.titleLarge(
                  'Cart',
                  fontWeight: 700,
                  letterSpacing: 0.3,
                ),
                MySpacing.width(8),
                Expanded(
                  child: MyText.bodySmall(
                    '${controller.orderItems.length} Items',
                    xMuted: true,
                  ),
                ),
                MySpacing.width(20),
                MyContainer.bordered(
                  onTap: () {
                    controller.goToCheckoutScreen();
                  },
                  color: theme.scaffoldBackgroundColor,
                  paddingAll: 8,
                  child: Row(
                    children: [
                      MyContainer(
                        paddingAll: 0,
                        borderRadiusAll: 0,
                        clipBehavior: Clip.antiAliasWithSaveLayer,
                        child: Image(
                          height: 24,
                          width: 28,
                          fit: BoxFit.cover,
                          image: AssetImage(Images.masterCard),
                        ),
                      ),
                      MySpacing.width(8),
                      MyText.bodySmall(
                        '5555',
                        xMuted: true,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            MySpacing.height(12),
            MyContainer.bordered(
              color: theme.scaffoldBackgroundColor,
              borderRadiusAll: 8,
              paddingAll: 12,
              child: Row(
                children: [
                  Icon(
                    LucideIcons.map_pin,
                    size: 20,
                  ),
                  MySpacing.width(20),
                  Expanded(
                    child: MyText.bodySmall(
                      '512, Saint Street, New York',
                    ),
                  ),
                  MySpacing.width(20),
                  MyButton.small(
                    onPressed: () {
                      controller.goToCheckoutScreen();
                    },
                    padding: MySpacing.xy(20, 10),
                    backgroundColor: customTheme.foodPrimary,
                    elevation: 0,
                    borderRadiusAll: 8,
                    splashColor: customTheme.foodOnPrimary.withAlpha(60),
                    child: MyText.bodySmall(
                      'Change',
                      color: customTheme.foodOnPrimary,
                    ),
                  ),
                ],
              ),
            ),
            MySpacing.height(20),
            MyText.titleMedium(
              'Orders',
              fontWeight: 600,
            ),
            MySpacing.height(20),
            _buildCartList(),
            Divider(),
            MySpacing.height(10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                MyText.bodySmall(
                  'Order',
                  fontWeight: 600,
                ),
                MyText.bodySmall(
                  '\$500.0',
                  fontWeight: 700,
                ),
              ],
            ),
            MySpacing.height(8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                MyText.bodySmall(
                  'Delivery',
                  fontWeight: 600,
                ),
                MyText.bodySmall(
                  'From Free to \$5',
                ),
              ],
            ),
            MySpacing.height(20),
            MyButton.block(
              onPressed: () {
                controller.goToOrderSuccessScreen();
              },
              backgroundColor: customTheme.foodPrimary,
              splashColor: customTheme.foodOnPrimary.withAlpha(60),
              elevation: 0,
              borderRadiusAll: 8,
              child: MyText.labelMedium(
                'Confirm',
                color: customTheme.foodOnPrimary,
                fontWeight: 600,
              ),
            ),
          ],
        ),
      );
    }
}

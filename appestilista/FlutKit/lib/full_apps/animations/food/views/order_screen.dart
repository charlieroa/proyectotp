import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/order_controller.dart';
import 'package:flutkit/full_apps/animations/food/models/order_item.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class OrderScreen extends StatefulWidget {
  const OrderScreen({super.key});

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late OrderController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(OrderController());
  }

  Widget _buildSingleOrderItem(OrderItem orderItem) {
    return Column(
      children: [
        Row(
          children: [
            MyContainer(
              paddingAll: 0,
              borderRadiusAll: 8,
              clipBehavior: Clip.antiAliasWithSaveLayer,
              child: Image(
                height: 48,
                width: 48,
                fit: BoxFit.cover,
                image: AssetImage(orderItem.foodItem.image),
              ),
            ),
            MySpacing.width(12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                          child: MyText.labelLarge(
                        orderItem.foodItem.name,
                        fontWeight: 600,
                      )),
                      MyText.bodySmall(
                        orderItem.date,
                        xMuted: true,
                        fontWeight: 600,
                      )
                    ],
                  ),
                  MySpacing.height(8),
                  MyText.bodySmall(
                    '${orderItem.quantity} Items',
                    xMuted: true,
                    fontWeight: 600,
                  ),
                ],
              ),
            ),
          ],
        ),
        MySpacing.height(12),
        MyButton.small(
          elevation: 0,
          borderRadiusAll: 4,
          padding: MySpacing.xy(132, 8),
          splashColor: customTheme.foodPrimary.withAlpha(60),
          backgroundColor: customTheme.foodPrimary.withAlpha(60),
          onPressed: () {},
          child: MyText.labelLarge(
            'Reorder',
            color: customTheme.foodPrimary,
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<OrderController>(
        init: controller,
        tag: 'food_order_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
      return Scaffold(
        body: ListView(
          padding: MySpacing.fromLTRB(
              20, MySpacing.safeAreaTop(context) + 20, 20, 20),
          children: [
            Row(
              children: [
                MyContainer(
                  onTap: () {
                    controller.goBack();
                  },
                  color: customTheme.foodPrimary.withAlpha(40),
                  paddingAll: 8,
                  borderRadiusAll: 8,
                  child: Icon(
                    LucideIcons.chevron_left,
                    size: 20,
                  ),
                ),
                Expanded(
                  child: MyText.titleMedium(
                    'Orders',
                    fontWeight: 600,
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
            MySpacing.height(20),
            Divider(),
            MySpacing.height(16),
            MyText.labelLarge(
              'Today',
              fontWeight: 700,
            ),
            MySpacing.height(12),
            _buildSingleOrderItem(controller.orderItems[0]),
            MySpacing.height(12),
            Divider(),
            MySpacing.height(12),
            MyText.labelLarge(
              'This Month',
              fontWeight: 700,
            ),
            MySpacing.height(12),
            _buildSingleOrderItem(controller.orderItems[1]),
            MySpacing.height(12),
            _buildSingleOrderItem(controller.orderItems[2]),
            MySpacing.height(12),
            Divider(),
            MySpacing.height(12),
            MyText.labelLarge(
              'Last Month',
              fontWeight: 700,
            ),
            MySpacing.height(12),
            _buildSingleOrderItem(controller.orderItems[0]),
          ],
        ),
      );
    }
}

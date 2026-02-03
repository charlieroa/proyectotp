import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/order_success_controller.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class OrderSuccessScreen extends StatefulWidget {
  const OrderSuccessScreen({super.key});

  @override
  State<OrderSuccessScreen> createState() => _OrderSuccessScreenState();
}

class _OrderSuccessScreenState extends State<OrderSuccessScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late OrderSuccessController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(OrderSuccessController());
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<OrderSuccessController>(
        init: controller,
        tag: 'food_order_success_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
      return Scaffold(
        body: MyContainer(
          marginAll: 0,
          borderRadiusAll: 0,
          padding: MySpacing.nBottom(20),
          height: MediaQuery.of(context).size.height,
          width: MediaQuery.of(context).size.width,
          color: customTheme.foodPrimary.withAlpha(30),
          child: Stack(
            children: [
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Image(
                    image: AssetImage(Images.foodOrderSuccess),
                  ),
                  MySpacing.height(32),
                  MyText.titleLarge(
                    'Order Successful !!',
                    fontWeight: 600,
                    color: customTheme.foodPrimary,
                  ),
                  MySpacing.height(8),
                  MyText.bodyMedium(
                    'You will receive your order very soon.',
                    xMuted: true,
                  ),
                  MySpacing.height(20),
                  MyButton.small(
                    onPressed: () {
                      controller.goToTrackOrderScreen();
                    },
                    padding: MySpacing.xy(20, 10),
                    backgroundColor: customTheme.foodPrimary,
                    elevation: 0,
                    borderRadiusAll: 8,
                    splashColor: customTheme.foodOnPrimary.withAlpha(60),
                    child: MyText.labelLarge(
                      'Track',
                      color: customTheme.foodOnPrimary,
                    ),
                  ),
                ],
              ),
              Positioned(
                top: MySpacing.safeAreaTop(context),
                child: InkWell(
                    onTap: () {
                      controller.goBack();
                    },
                    child: Icon(
                      LucideIcons.chevron_left,
                      size: 20,
                    )),
              ),
            ],
          ),
        ),
      );

  }
}

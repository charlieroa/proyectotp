import 'package:flutkit/full_apps/animations/plant/controller/plant_shopping_controller.dart';
import 'package:flutkit/full_apps/animations/plant/model/plant_cart_data.dart';

import 'package:flutkit/helpers/extensions/double_extension.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class PlantShoppingScreen extends StatefulWidget {
  final BuildContext rootContext;

  const PlantShoppingScreen({super.key, required this.rootContext});

  @override
  State<PlantShoppingScreen> createState() => _PlantShoppingScreenState();
}

class _PlantShoppingScreenState extends State<PlantShoppingScreen>
    with TickerProviderStateMixin {
  late PlantShoppingController controller;
  late OutlineInputBorder outlineInputBorder;

  @override
  void initState() {
    controller = PlantShoppingController();
    outlineInputBorder = OutlineInputBorder(
        borderRadius: BorderRadius.all(
          Radius.circular(12),
        ),
        borderSide: BorderSide.none);
    super.initState();
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<PlantShoppingController>(
      init: controller,
      tag: 'plant_shopping_controller',
      builder: (controller) {
        return Scaffold(
          appBar: AppBar(
            elevation: 1,
            title: MyText.titleMedium(
              'My Cart',
              fontSize: 20,
              fontWeight: 600,
            ),
            centerTitle: true,
            automaticallyImplyLeading: false,
          ),
          floatingActionButtonLocation:
              FloatingActionButtonLocation.centerFloat,
          floatingActionButton: Padding(
            padding: MySpacing.x(20),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                buildCartButton(),
              ],
            ),
          ),
          body: Padding(
            padding: MySpacing.xy(20, 12),
            child: ListView(
              children: <Widget>[
                Column(children: [
                  buildCarts(),
                  MySpacing.height(12),
                  buildBillingDetail(),
                ]),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget buildBillingDetail() {
    return MyContainer(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          MyText.bodyMedium(
            'Billing Details',
            fontWeight: 600,
            muted: true,
          ),
          MySpacing.height(8),
          buildBillInformation('Total Order', "\$${controller.order.precise}"),
          MySpacing.height(8),
          buildBillInformation('Tex', "\$${controller.tax.precise}"),
          MySpacing.height(8),
          buildBillInformation('Offer', "- \$${controller.offer.precise}"),
          Divider(
            height: 40,
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              MyText.bodyMedium(
                'Grand Total',
                fontWeight: 600,
              ),
              MyText.bodyMedium(
                controller.total.precise,
                fontWeight: 600,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget buildBillInformation(String title, String detail) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        MyText.titleMedium(
          title,
          fontWeight: 600,
        ),
        MyText.titleMedium(
          detail,
          fontWeight: 600,
        ),
      ],
    );
  }

  Widget buildChargeContain(String title, String subTitle) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        MyText.bodyMedium(
          title,
          fontSize: 16,
          fontWeight: 600,
          color: AppTheme.plantTheme.colorScheme.primary,
        ),
        MyText.bodyMedium(
          subTitle,
          fontSize: 16,
          fontWeight: 600,
        ),
      ],
    );
  }

  Widget buildCartButton() {
    return MyButton.block(
      elevation: 0,
      backgroundColor: AppTheme.plantTheme.colorScheme.primary,
      padding: MySpacing.y(20),
      borderRadiusAll: 8,
      onPressed: () {
        controller.gotoPaymentScreen();
      },
      child: MyText.bodyMedium(
        'Proceed to Checkout',
        fontSize: 16,
        fontWeight: 600,
        color: AppTheme.plantTheme.colorScheme.surface,
      ),
    );
  }

  Widget buildCarts() {
    List<Widget> list = [];

    for (PlantCart cart in controller.plantCart!) {
      list.add(MySpacing.height(12));
      list.add(
        MyContainer(
          borderRadiusAll: 8,
          child: Row(
            children: [
              MyContainer(
                borderRadiusAll: 12,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                paddingAll: 0,
                color: cart.color,
                child: Hero(
                  tag: UniqueKey(),
                  child: Image.asset(
                    cart.image,
                    height: 100,
                    width: 100,
                    fit: BoxFit.contain,
                  ),
                ),
              ),
              MySpacing.width(16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    MyText.titleMedium(
                      cart.title,
                      fontWeight: 600,
                      muted: true,
                    ),
                    MySpacing.height(4),
                    MyText.titleSmall(
                      "\$ ${cart.price}.00",
                      fontWeight: 600,
                    ),
                    MySpacing.height(4),
                    MyText.bodySmall(
                      cart.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      fontWeight: 600,
                      muted: true,
                    ),
                  ],
                ),
              ),
              Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  MyContainer(
                    borderRadiusAll: 4,
                    onTap: () {
                      controller.decrement(cart);
                    },
                    padding: MySpacing.all(8),
                    color:
                        AppTheme.plantTheme.colorScheme.primary.withAlpha(70),
                    child: Icon(
                      LucideIcons.minus,
                      size: 14,
                      color: AppTheme.plantTheme.colorScheme.primary,
                    ),
                  ),
                  MySpacing.height(8),
                  MyText.bodyLarge(cart.quantity.toString(), fontWeight: 600),
                  MySpacing.height(8),
                  MyContainer(
                    borderRadiusAll: 4,
                    onTap: () {
                      controller.increment(cart);
                    },
                    padding: MySpacing.all(8),
                    color:
                        AppTheme.plantTheme.colorScheme.primary.withAlpha(70),
                    child: Icon(
                      LucideIcons.plus,
                      size: 14,
                      color: AppTheme.plantTheme.colorScheme.primary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      children: list,
    );
  }
}

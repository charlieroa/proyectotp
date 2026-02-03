import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/subscription_controller.dart';
import 'package:flutkit/full_apps/animations/food/models/subscription.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late SubscriptionController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(SubscriptionController());
  }

  Widget _buildBenefitList(List<String> benefits, Color color) {
    List<Widget> list = [];

    for (String benefit in benefits) {
      list.add(
        Row(
          children: [
            MyContainer.rounded(
              paddingAll: 4,
              color: color,
              child: Container(),
            ),
            MySpacing.width(12),
            MyText.bodySmall(
              benefit
            ),
          ],
        ),
      );
      list.add(
        MySpacing.height(4),
      );
    }

    return Column(
      children: list,
    );
  }

  Widget _buildPlanList() {
    List<Widget> list = [];

    for (Subscription subscription in controller.subscriptions) {
      bool selected = subscription == controller.subscription;
      list.add(
        MyContainer.bordered(
          onTap: () {
            controller.selectPlan(subscription);
          },
          borderRadiusAll: 8,
          paddingAll: 16,
          margin: MySpacing.bottom(20),
          border: Border.all(
              color: (selected
                      ? customTheme.foodPrimary
                      : theme.colorScheme.onSurface)
                  .withAlpha(160)),
          color: selected
              ? customTheme.foodPrimary.withAlpha(40)
              : customTheme.card,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        MyText.bodyLarge(
                          subscription.type,
                          fontWeight: 700,
                        ),
                        MySpacing.height(2),
                        MyText.bodySmall(
                          subscription.description,
                          xMuted: true,
                        ),
                      ],
                    ),
                  ),
                  MyText.titleLarge(
                    '\$${subscription.price}',
                    fontWeight: 700,
                    color: selected ? customTheme.foodPrimary : null,
                  ),
                ],
              ),
              MySpacing.height(20),
              _buildBenefitList(
                  subscription.benefits,
                  selected
                      ? customTheme.foodPrimary
                      : theme.colorScheme.onSurface),
            ],
          ),
        ),
      );
    }

    return Column(
      children: list,
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SubscriptionController>(
        init: controller,
        tag: 'food_subscription_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {

      return Scaffold(
        body: Padding(
          padding: MySpacing.fromLTRB(
              20, MySpacing.safeAreaTop(context) + 20, 20, 20),
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
                      'Subscription & Pricing',
                      fontWeight: 600,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ),
              MySpacing.height(32),
              MyText.bodySmall(
                'Choose any of the plan to enjoy the accompanying benefits with it. Any plan can be upgraded later on to enjoy more features.',
              ),
              MySpacing.height(20),
              _buildPlanList(),
              MySpacing.height(12),
              MyButton.block(
                onPressed: () {
                  controller.goBack();
                },
                elevation: 0,
                borderRadiusAll: 8,
                splashColor: customTheme.foodOnPrimary.withAlpha(40),
                backgroundColor: customTheme.foodPrimary,
                child: MyText.labelLarge(
                  'Proceed to payment',
                  color: customTheme.foodOnPrimary,
                  fontWeight: 600,
                ),
              ),
            ],
          ),
        ),
      );
    }
  }

import 'package:flutkit/full_apps/other/fitness/controllers/subscription_controller.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/loading_effect.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  _SubscriptionScreenState createState() => _SubscriptionScreenState();
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

    controller = SubscriptionController();
  }

  Widget _buildSingleBenefit(String benefit) {
    return Row(
      children: [
        MyContainer.rounded(
          paddingAll: 4,
          margin: MySpacing.y(8),
          color: customTheme.fitnessPrimary.withAlpha(30),
          child: Icon(
            LucideIcons.check,
            size: 12,
            color: customTheme.fitnessPrimary,
          ),
        ),
        MySpacing.width(16),
        MyText.bodySmall(
          benefit,
          xMuted: true,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<SubscriptionController>(
        init: controller,
        tag: 'subscription_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
    if (controller.uiLoading) {
      return Scaffold(
          body: Padding(
        padding: MySpacing.top(MySpacing.safeAreaTop(context) + 20),
        child: LoadingEffect.getSearchLoadingScreen(context),
      ));
    } else {
      return Scaffold(
        appBar: AppBar(
          elevation: 0,
          leading: InkWell(
            onTap: () {
              controller.goBack();
            },
            child: Icon(
              Icons.chevron_left,
              size: 20,
            ),
          ),
          title: MyText.titleMedium(
            'Subscription',
            color: theme.colorScheme.onSurface,
            fontWeight: 600,
          ),
        ),
        body: Padding(
          padding: MySpacing.fromLTRB(20, 8, 20, 20),
          child: Column(
            //  mainAxisAlignment: MainAxisAlignment.center,
            children: [
              MyContainer(
                borderRadiusAll: 4,
                color: customTheme.fitnessPrimary.withAlpha(30),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    MyText.labelMedium(
                      'Upgrade your plan to enjoy \nour premium gym plan. ',
                      color: customTheme.fitnessPrimary,
                    ),
                    MyButton.small(
                      onPressed: () {
                        controller.goBack();
                      },
                      elevation: 0,
                      borderRadiusAll: 4,
                      padding: MySpacing.xy(20, 16),
                      splashColor: customTheme.fitnessOnPrimary.withAlpha(40),
                      backgroundColor: customTheme.fitnessPrimary,
                      child: MyText.labelMedium(
                        'Upgrade',
                        color: customTheme.fitnessOnPrimary,
                        fontWeight: 600,
                      ),
                    ),
                  ],
                ),
              ),
              MySpacing.height(20),
              MyContainer.bordered(
                color: customTheme.cardDark,
                borderRadiusAll: 4,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        MyContainer(
                          paddingAll: 8,
                          borderRadiusAll: 4,
                          color: customTheme.fitnessPrimary,
                          child: Icon(
                            LucideIcons.credit_card,
                            size: 16,
                            color: customTheme.fitnessOnPrimary,
                          ),
                        ),
                        MySpacing.width(20),
                        MyText.bodyLarge(
                          'Premium',
                          fontWeight: 600,
                        ),
                      ],
                    ),
                    MySpacing.height(16),
                    Row(
                      children: [
                        MyText.headlineSmall(
                          '\$29',
                          fontWeight: 700,
                        ),
                        Padding(
                          padding: MySpacing.top(4),
                          child: MyText.titleSmall(
                            ' /month',
                            muted: true,
                          ),
                        ),
                      ],
                    ),
                    MySpacing.height(8),
                    MyContainer(
                      padding: MySpacing.xy(8, 4),
                      borderRadiusAll: 2,
                      color: customTheme.fitnessPrimary.withAlpha(30),
                      child: MyText.bodySmall(
                        '1 week free trial',
                        color: customTheme.fitnessPrimary,
                      ),
                    ),
                    MySpacing.height(16),
                    Divider(),
                    MySpacing.height(8),
                    _buildSingleBenefit('Personal Assistance and Training'),
                    _buildSingleBenefit('Music and Video Entertainment'),
                    _buildSingleBenefit('Nutritional Support'),
                    _buildSingleBenefit('Weekly Steam and Physiotherapy'),
                  ],
                ),
              ),
              MySpacing.height(20),
              MyButton.block(
                buttonType: MyButtonType.outlined,
                splashColor: customTheme.fitnessPrimary.withAlpha(60),
                borderColor: customTheme.fitnessPrimary,
                borderRadiusAll: 4,
                onPressed: () {},
                elevation: 0,
                child: MyText.bodyMedium(
                  'Choose Premium',
                  color: customTheme.fitnessPrimary,
                ),
              ),
            ],
          ),
        ),
      );
    }
  }
}

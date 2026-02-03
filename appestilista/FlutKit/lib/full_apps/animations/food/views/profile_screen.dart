import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/profile_controller.dart';
import 'package:flutter_lucide/flutter_lucide.dart';
import 'package:get/get.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late ThemeData theme;
  late CustomTheme customTheme;

  late ProfileController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;

    controller = Get.put(ProfileController());
  }

  Widget _buildSingleRow(String name, IconData iconData) {
    return Row(
      children: [
        Icon(
          iconData,
          size: 20,
          color: theme.colorScheme.onSurface.withAlpha(160),
        ),
        MySpacing.width(20),
        Expanded(
          child: MyText.bodyMedium(
            name,
            fontWeight: 600,
          ),
        ),
        MySpacing.width(20),
        Icon(
          LucideIcons.chevron_right,
          size: 16,
          color: theme.colorScheme.onSurface.withAlpha(160),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ProfileController>(
        init: controller,
        tag: 'food_profile_controller',
        builder: (controller) {
          return _buildBody();
        });
  }

  Widget _buildBody() {
 {
      return Scaffold(
        body: Padding(
          padding: MySpacing.fromLTRB(
              20, MySpacing.safeAreaTop(context) + 20, 20, 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InkWell(
                onTap: () => controller.goToEditProfileScreen(),
                child: Row(
                  children: [
                    MyContainer(
                      height: 64,
                      width: 64,
                      paddingAll: 0,
                      borderRadiusAll: 8,
                      clipBehavior: Clip.antiAliasWithSaveLayer,
                      child: Image(
                        fit: BoxFit.cover,
                        image: AssetImage(Images.foodProfile),
                      ),
                    ),
                    MySpacing.width(12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          MyText.bodyLarge('Helly Seth',
                              fontWeight: 700, textAlign: TextAlign.center),
                          MySpacing.height(8),
                          MyText.bodyMedium(
                            '+91 8965412370',
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                    MySpacing.width(12),
                    Icon(
                      LucideIcons.chevron_right,
                      size: 16,
                    ),
                  ],
                ),
              ),
              MySpacing.height(20),
              MyContainer(
                paddingAll: 20,
                borderRadiusAll: 8,
                child: Column(
                  children: [
                    InkWell(
                      onTap: () {
                        controller.goToOrderScreen();
                      },
                      child: _buildSingleRow(
                          'My Orders', LucideIcons.shopping_cart),
                    ),
                    MySpacing.height(20),
                    InkWell(
                      onTap: () {
                        controller.goToCheckoutScreen();
                      },
                      child: _buildSingleRow('Address', LucideIcons.map_pin),
                    ),
                    MySpacing.height(20),
                    InkWell(
                      onTap: () {
                        controller.goToCheckoutScreen();
                      },
                      child: _buildSingleRow(
                          'Payment Methods', LucideIcons.credit_card),
                    ),
                    MySpacing.height(20),
                    InkWell(
                      onTap: () {
                        controller.goToSubscriptionScreen();
                      },
                      child: _buildSingleRow(
                          'Subscription Plans', LucideIcons.zap),
                    ),
                    MySpacing.height(20),
                    _buildSingleRow('My Vouchers', LucideIcons.gift),
                  ],
                ),
              ),
              MySpacing.height(20),
              MyContainer(
                borderRadiusAll: 8,
                paddingAll: 20,
                child: Column(
                  children: [
                    _buildSingleRow('Notification', LucideIcons.bell),
                    MySpacing.height(20),
                    _buildSingleRow('Language', LucideIcons.globe),
                    MySpacing.height(20),
                    _buildSingleRow('Settings', LucideIcons.settings),
                    MySpacing.height(20),
                    _buildSingleRow('Invite Friends', LucideIcons.users),
                    MySpacing.height(20),
                    _buildSingleRow('Support', LucideIcons.circle_question_mark),
                  ],
                ),
              ),
              MySpacing.height(20),
              Center(
                child: MyButton.small(
                  onPressed: () {
                    controller.goToSplashScreen();
                  },
                  elevation: 0,
                  borderRadiusAll: 8,
                  padding: MySpacing.xy(20, 10),
                  splashColor: customTheme.foodOnPrimary.withAlpha(60),
                  backgroundColor: customTheme.foodPrimary,
                  child: MyText.labelLarge(
                    'Logout',
                    color: customTheme.foodOnPrimary,
                    fontWeight: 600,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
  }
}

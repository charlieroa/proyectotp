import 'package:flutkit/full_apps/other/fitness/controllers/profile_controller.dart';
import 'package:flutkit/helpers/extensions/extensions.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_button.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/images.dart';
import 'package:flutkit/loading_effect.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  _ProfileScreenState createState() => _ProfileScreenState();
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

    controller = ProfileController();
  }

  Widget _buildSingleProfileInfo(String info, IconData iconData, bool isArrow) {
    return Padding(
      padding: MySpacing.bottom(20),
      child: Row(
        children: [
          Icon(
            iconData,
            size: 20,
            color: customTheme.fitnessPrimary,
          ),
          MySpacing.width(20),
          Expanded(
              child: MyText.labelMedium(
            info,
            fontSize: 16,
          )),
          MySpacing.width(20),
          isArrow
              ? Icon(
                  LucideIcons.chevron_right,
                  size: 20,
                ).autoDirection()
              : Container(),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<ProfileController>(
        init: controller,
        tag: 'profile_controller',
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
        ),
      );
    } else {
      return Scaffold(
        body: ListView(
          padding: MySpacing.fromLTRB(
              20, MySpacing.safeAreaTop(context) + 36, 20, 20),
          children: [
            Center(
              child: MyContainer.rounded(
                height: 80,
                width: 80,
                paddingAll: 0,
                clipBehavior: Clip.antiAliasWithSaveLayer,
                child: Image(
                  fit: BoxFit.cover,
                  image: AssetImage(Images.fitnessProfile),
                ),
              ),
            ),
            MySpacing.height(8),
            Center(
              child: MyText.titleMedium(
                'John Smit',
                fontWeight: 700,
              ),
            ),
            MySpacing.height(20),
            MyContainer(
                borderRadiusAll: 4,
                onTap: () {
                  controller.goToSubscription();
                },
                paddingAll: 20,
                color: customTheme.fitnessPrimary.withAlpha(40),
                child: Row(
                  children: [
                    Icon(
                      LucideIcons.upload,
                      color: customTheme.fitnessPrimary,
                      size: 20,
                    ),
                    MySpacing.width(20),
                    MyText.bodyMedium(
                      "Upgrade Your plan",
                      color: customTheme.fitnessPrimary,
                      fontWeight: 600,
                    ),
                  ],
                )),
            MySpacing.height(20),
            _buildSingleProfileInfo('Personal', LucideIcons.user, false),
            _buildSingleProfileInfo('Goals', LucideIcons.award, false),
            _buildSingleProfileInfo('Groups', LucideIcons.users, false),
            _buildSingleProfileInfo(
                'Privacy & Security', LucideIcons.shield, true),
            _buildSingleProfileInfo(
                'Advanced Settings', LucideIcons.settings, true),
            MySpacing.height(16),
            Row(
              children: [
                MyText.labelMedium(
                  'Devices',
                  fontWeight: 700,
                ),
              ],
            ),
            MySpacing.height(20),
            MyContainer(
              borderRadiusAll: 0,
              paddingAll: 20,
              child: Column(
                children: [
                  Row(
                    children: [
                      Icon(
                        LucideIcons.smartphone,
                        size: 24,
                        color: customTheme.fitnessPrimary,
                      ),
                      MySpacing.width(12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            MyText.labelMedium(
                              'Mobile Track',
                              fontWeight: 600,
                            ),
                            MySpacing.height(2),
                            MyText.labelSmall(
                              'Linked to another device',
                            ),
                          ],
                        ),
                      ),
                      MySpacing.width(20),
                      Icon(
                        LucideIcons.ellipsis_vertical,
                        size: 20,
                        color: theme.colorScheme.onSurface,
                      ),
                    ],
                  ),
                  MySpacing.height(20),
                  Row(
                    children: [
                      Icon(
                        LucideIcons.circle_plus,
                        size: 24,
                        color: customTheme.fitnessPrimary,
                      ),
                      MySpacing.width(12),
                      MyText.labelMedium(
                        'Set up a device',
                        fontWeight: 600,
                      ),
                    ],
                  )
                ],
              ),
            ),
            MySpacing.height(20),
            MyButton.block(
              elevation: 0,
              borderRadiusAll: 4,
              padding: MySpacing.y(20),
              backgroundColor: customTheme.fitnessPrimary.withAlpha(40),
              onPressed: () {
                controller.logout();
              },
              child: MyText.bodyMedium(
                'Log Out',
                fontWeight: 600,
                fontSize: 16,
                color: customTheme.fitnessPrimary,
              ),
            ),
          ],
        ),
      );
    }
  }
}

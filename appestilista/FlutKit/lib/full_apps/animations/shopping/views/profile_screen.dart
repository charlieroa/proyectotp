import 'package:flutkit/full_apps/animations/shopping/controllers/profile_controller.dart';

import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_text.dart';
import 'package:flutkit/loading_effect.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_lucide/flutter_lucide.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  late ThemeData theme;

  late ProfileController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.shoppingTheme;

    controller = ProfileController();
  }

  Widget _buildSingleRow(String name, IconData icon) {
    return Row(
      children: [
        Icon(
          icon,
          size: 20,
        ),
        MySpacing.width(20),
        Expanded(
            child: MyText.bodyMedium(
          name,
          fontWeight: 600,
        )),
        MySpacing.width(20),
        Icon(
          LucideIcons.chevron_right,
          size: 20,
        ),
      ],
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
        body: Container(
            margin: MySpacing.top(20),
            child: LoadingEffect.getReviewLoadingScreen(
              context,
            )),
      );
    } else {
      return Scaffold(
        body: ListView(
          padding: MySpacing.fromLTRB(
              20, MySpacing.safeAreaTop(context) + 20, 20, 20),
          children: [
            MyText.bodySmall(
              'ACCOUNT',
              fontWeight: 700,
              letterSpacing: 0.2,
              muted: true,
            ),
            MySpacing.height(20),
            Row(
              children: [
                Icon(
                  LucideIcons.user,
                  size: 20,
                ),
                MySpacing.width(20),
                Expanded(
                    child: MyText.bodyMedium('My account', fontWeight: 600)),
                MySpacing.width(20),
                MyContainer(
                  onTap: () {
                    controller.logout();
                  },
                  padding: MySpacing.xy(20, 8),
                  borderRadiusAll: 4,
                  color: theme.colorScheme.primary,
                  child: MyText.bodySmall(
                    'Log Out',
                    fontWeight: 700,
                    letterSpacing: 0.3,
                    color: theme.colorScheme.onPrimary,
                  ),
                ),
              ],
            ),
            MySpacing.height(20),
            InkWell(
              onTap: () {
                controller.goToSubscription();
              },
              child: Row(
                children: [
                  Icon(
                    LucideIcons.circle_check,
                    size: 20,
                    color: theme.colorScheme.primary,
                  ),
                  MySpacing.width(20),
                  MyText.bodyMedium('Subscriptions',
                      color: theme.colorScheme.primary, fontWeight: 600),
                ],
              ),
            ),
            MySpacing.height(20),
            MyText.bodySmall(
              'CONTENT & ACTIVITY',
              fontWeight: 700,
              letterSpacing: 0.2,
              muted: true,
            ),
            MySpacing.height(20),
            Row(
              children: [
                Icon(
                  LucideIcons.globe,
                  size: 20,
                ),
                MySpacing.width(20),
                Expanded(
                    child: MyText.bodyMedium(
                  'App Language',
                  fontWeight: 600,
                )),
                MySpacing.width(20),
                MyText.bodyMedium(
                  'English',
                  fontWeight: 600,
                  muted: true,
                ),
                MySpacing.width(4),
                Icon(
                  LucideIcons.chevron_right,
                  size: 20,
                ),
              ],
            ),
            MySpacing.height(20),
            Row(
              children: [
                Icon(
                  LucideIcons.dollar_sign,
                  size: 20,
                ),
                MySpacing.width(20),
                Expanded(
                    child: MyText.bodyMedium(
                  'Currency',
                  fontWeight: 600,
                )),
                MySpacing.width(20),
                MyText.bodyMedium(
                  'USD',
                  fontWeight: 700,
                ),
              ],
            ),
            MySpacing.height(20),
            _buildSingleRow('Dark Mode', LucideIcons.moon),
            MySpacing.height(20),
            MyText.bodySmall(
              'SUPPORT',
              fontWeight: 700,
              letterSpacing: 0.2,
              muted: true,
            ),
            MySpacing.height(20),
            _buildSingleRow('Report a problem', LucideIcons.octagon_alert),
            MySpacing.height(20),
            _buildSingleRow('Help center', LucideIcons.circle_alert),
            MySpacing.height(20),
            MyText.bodySmall(
              'ABOUT',
              fontWeight: 700,
              letterSpacing: 0.2,
              muted: true,
            ),
            MySpacing.height(20),
            _buildSingleRow('Community Guidelines', LucideIcons.eye),
            MySpacing.height(20),
            _buildSingleRow('Terms of Use', LucideIcons.bookmark),
            MySpacing.height(20),
            _buildSingleRow('Location', LucideIcons.map_pin),
            MySpacing.height(20),
            Divider(
              thickness: 0.8,
            ),
            MySpacing.height(8),
            MyContainer(
              color: theme.colorScheme.primary.withAlpha(28),
              borderRadiusAll: 4,
              child: MyText.bodyMedium(
                "© 2022 Flutkit, Design by Coderthemes",
                textAlign: TextAlign.center,
                fontWeight: 600,
                letterSpacing: 0.2,
                color: theme.colorScheme.primary,
              ),
            ),

          ],
        ),
      );
    }
  }
}

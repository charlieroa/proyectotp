import 'package:flutkit/full_apps/other/fitness/controllers/full_app_controller.dart';
import 'package:flutkit/full_apps/other/fitness/views/analytics_screen.dart';
import 'package:flutkit/full_apps/other/fitness/views/home_screen.dart';
import 'package:flutkit/full_apps/other/fitness/views/profile_screen.dart';
import 'package:flutkit/full_apps/other/fitness/views/schedule_screen.dart';
import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_tab_indicator_style.dart';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

class FullApp extends StatefulWidget {
  const FullApp({super.key});

  @override
  _FullAppState createState() => _FullAppState();
}

class _FullAppState extends State<FullApp> with SingleTickerProviderStateMixin {
  late ThemeData theme;
  late CustomTheme customTheme;

  late FullAppController controller;

  @override
  void initState() {
    super.initState();
    theme = AppTheme.theme;
    customTheme = AppTheme.customTheme;
    controller = FullAppController(this);
  }

  List<Widget> buildTab() {
    List<Widget> tabs = [];

    for (int i = 0; i < controller.navItems.length; i++) {
      tabs.add(Icon(
        controller.navItems[i].iconData,
        size: 22,
        color: (controller.currentIndex == i)
            ? customTheme.fitnessPrimary
            : theme.colorScheme.onSurface,
      ));
    }
    return tabs;
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<FullAppController>(
        init: controller,
        tag: 'full_app_controller',
        builder: (controller) {
          return Scaffold(
            body: Column(
              children: [
                Expanded(
                  child: TabBarView(
                    physics: NeverScrollableScrollPhysics(),
                    controller: controller.tabController,
                    children: <Widget>[
                      HomeScreen(),
                      ScheduleScreen(),
                      AnalyticsScreen(),
                      ProfileScreen(),
                    ],
                  ),
                ),
                MyContainer.none(
                  padding: MySpacing.xy(12, 16),
                  color: theme.scaffoldBackgroundColor,
                  bordered: true,
                  enableBorderRadius: false,
                  borderRadiusAll: 0,
                  border: Border(
                    top: BorderSide(width: 2, color: customTheme.border),
                  ),
                  child: TabBar(
                    controller: controller.tabController,
                    indicator: MyTabIndicator(
                        indicatorColor: customTheme.fitnessPrimary,
                        indicatorStyle: MyTabIndicatorStyle.rectangle,
                        indicatorHeight: 2,
                        radius: 4,
                        yOffset: -18,
                        width: 20),
                    indicatorSize: TabBarIndicatorSize.tab,
                    indicatorColor: customTheme.fitnessPrimary,
                    tabs: buildTab(),
                  ),
                )
              ],
            ),
          );
        });
  }
}

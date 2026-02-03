import 'package:flutkit/helpers/theme/app_theme.dart';
import 'package:flutkit/helpers/widgets/my_container.dart';
import 'package:flutkit/helpers/widgets/my_spacing.dart';
import 'package:flutkit/helpers/widgets/my_tab_indicator_style.dart';
import 'package:flutter/material.dart';
import 'package:flutkit/full_apps/animations/food/controllers/full_app_controller.dart';
import 'package:flutkit/full_apps/animations/food/views/cart_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/home_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/profile_screen.dart';
import 'package:flutkit/full_apps/animations/food/views/search_screen.dart';
import 'package:get/get.dart';

class FullApp extends StatefulWidget {
  const FullApp({super.key});

  @override
  State<FullApp> createState() => _FullAppState();
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

    controller = Get.put(FullAppController(this));
  }

  List<Widget> buildTab() {
    List<Widget> tabs = [];

    for (int i = 0; i < controller.navItems.length; i++) {
      tabs.add(Icon(
              controller.navItems[i].iconData,
              size: 20,
              color: (controller.currentIndex == i)
        ? customTheme.foodPrimary
        : theme.colorScheme.onSurface,
            ));
    }
    return tabs;
  }

  @override
  Widget build(BuildContext context) {
    return GetBuilder<FullAppController>(
        init: controller,
        tag: 'food_full_app_controller',
        builder: (controller) {
          return Scaffold(
            body: Column(
              children: [
                MySpacing.height(4),
                Expanded(
                  child: TabBarView(
                    controller: controller.tabController,
                    children: <Widget>[
                      HomeScreen(),
                      SearchScreen(),
                      CartScreen(),
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
                    dividerColor: Colors.transparent,
                    controller: controller.tabController,
                    indicator: MyTabIndicator(
                        indicatorColor: customTheme.foodPrimary,
                        indicatorStyle: MyTabIndicatorStyle.rectangle,
                        indicatorHeight: 2,
                        radius: 4,
                        yOffset: -18,
                        width: 20),
                    indicatorSize: TabBarIndicatorSize.tab,
                    indicatorColor: customTheme.foodPrimary,
                    tabs: buildTab(),
                  ),
                )
              ],
            ),
          );
        });
  }
}
